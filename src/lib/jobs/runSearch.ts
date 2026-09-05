import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { decryptSecret } from "@/lib/crypto";
import { getXProvider, type XSearchFilters } from "@/lib/providers/x";
import { getAIProvider } from "@/lib/providers/ai";
import type { AIProvider, AIProviderConfig } from "@/lib/providers/ai/types";
import { analyzeSimilarity, SIMILARITY_METHOD, SIMILARITY_THRESHOLD } from "@/lib/similarity";
import { scoreRelevance, SCORING_RUBRIC_VERSION } from "@/lib/scoring";
import { generateReport } from "@/lib/report";
import { registerRun, unregisterRun } from "./registry";

const STUCK_RUN_TIMEOUT_MS = 15 * 60_000;
const TERMINAL_STATUSES = new Set(["completed", "partial", "failed", "canceled"]);

async function setStatus(runId: string, status: string) {
  await prisma.searchRun.update({ where: { id: runId }, data: { status } });
}

export async function runSearchPipeline(runId: string): Promise<void> {
  // Idempotency guard: only the caller that successfully claims the run (pending -> fetching)
  // actually executes the pipeline. A retry/duplicate trigger on the same run is a no-op.
  const claimed = await prisma.searchRun.updateMany({
    where: { id: runId, status: "pending" },
    data: { status: "fetching" },
  });
  if (claimed.count === 0) return;

  const run = await prisma.searchRun.findUnique({ where: { id: runId }, include: { search: true } });
  if (!run) return;
  const userId = run.search.userId;
  const controller = registerRun(runId);

  try {
    await recordAuditEvent({
      searchId: run.searchId,
      runId,
      userId,
      actorType: "system",
      action: "retrieval_started",
      outcome: "in_progress",
      metadata: { provider: run.provider, requestedCount: run.requestedCount },
    });

    const xConn = await prisma.xConnectionSettings.findUnique({ where: { userId } });
    const useReal = xConn?.status === "tested_ok" && !!xConn.encryptedCredentials;
    const xProvider = getXProvider(useReal ? xConn!.provider : "demo");
    const creds = useReal ? { bearerToken: decryptSecret(xConn!.encryptedCredentials!) } : {};
    const filters = run.filtersJson as unknown as XSearchFilters;

    const searchResult = await xProvider.search(creds, run.search.topic, filters, run.requestedCount, controller.signal);

    await recordAuditEvent({
      searchId: run.searchId,
      runId,
      userId,
      actorType: "system",
      action: "retrieval_completed",
      outcome: searchResult.status,
      metadata: { retrievedCount: searchResult.retrievedCount, provider: xProvider.id, effectiveQuery: searchResult.effectiveQuery },
    });

    if (searchResult.status === "failed" || searchResult.status === "canceled") {
      // Failed/canceled runs record status and available metadata only (Section 7) —
      // they do not proceed to extraction, scoring, or report generation.
      await prisma.searchRun.update({
        where: { id: runId },
        data: {
          status: searchResult.status,
          errorMessage: searchResult.errorMessage,
          errorCode: searchResult.errorCode,
          effectiveQuery: searchResult.effectiveQuery,
          retrievedCount: searchResult.retrievedCount,
          completedAt: new Date(),
        },
      });
      await recordAuditEvent({
        searchId: run.searchId,
        runId,
        userId,
        actorType: searchResult.status === "canceled" ? "user" : "system",
        action: searchResult.status === "canceled" ? "run_canceled" : "run_failed",
        outcome: searchResult.status,
        metadata: { retrievedCount: searchResult.retrievedCount, errorCode: searchResult.errorCode },
      });
      return;
    }

    await setStatus(runId, "extracting");
    const createdPosts = [];
    for (const post of searchResult.posts) {
      const created = await prisma.collectedPost.create({
        data: {
          runId,
          postId: post.postId,
          authorName: post.authorName,
          authorHandle: post.authorHandle,
          text: post.text,
          isTruncated: post.isTruncated,
          missingFields: post.missingFields,
          language: post.language,
          url: post.url,
          postedAt: new Date(post.postedAt),
          isRepost: post.isRepost,
          isReply: post.isReply,
          engagementJson: post.engagement,
          engagementCollectedAt: post.engagementCollectedAt ? new Date(post.engagementCollectedAt) : undefined,
        },
      });
      createdPosts.push(created);
    }

    await recordAuditEvent({
      searchId: run.searchId,
      runId,
      userId,
      actorType: "system",
      action: "extraction_completed",
      outcome: "ok",
      metadata: { postCount: createdPosts.length },
    });

    if (controller.signal.aborted) {
      await finalizeCanceled(runId, run.searchId, userId, "canceled_during_extraction");
      return;
    }

    // Near-duplicate / Similar Content % analysis (Section 2 addendum).
    const similarity = analyzeSimilarity(createdPosts.map((p) => ({ id: p.id, text: p.text })));
    for (const cluster of similarity.clusters) {
      const clusterRow = await prisma.duplicateCluster.create({
        data: { runId, representativeText: cluster.representativeText, memberCount: cluster.memberIds.length },
      });
      await prisma.collectedPost.updateMany({
        where: { id: { in: cluster.memberIds } },
        data: { duplicateClusterId: clusterRow.id },
      });
    }

    await recordAuditEvent({
      searchId: run.searchId,
      runId,
      userId,
      actorType: "system",
      action: "deduplication_completed",
      outcome: "ok",
      metadata: { clusterCount: similarity.clusterCount, similarContentPct: similarity.similarContentPct },
    });

    await setStatus(runId, "scoring");
    const aiBundle = await resolveAIBundle(userId);
    const scoring = await scoreRelevance(run.search.topic, createdPosts.map((p) => ({ id: p.id, text: p.text })), aiBundle);

    await prisma.$transaction(
      scoring.scores.map((s) =>
        prisma.relevanceScore.create({
          data: {
            runId,
            postId: s.postId,
            score: s.score ?? undefined,
            explanation: s.explanation || undefined,
            isScorable: s.isScorable,
            unscorableReason: s.unscorableReason,
          },
        })
      )
    );

    await recordAuditEvent({
      searchId: run.searchId,
      runId,
      userId,
      actorType: "system",
      action: "relevance_scoring_completed",
      outcome: scoring.source,
      metadata: { scoredCount: scoring.scoredCount, unscorableCount: scoring.unscorableCount, averageTopicMatch: scoring.averageTopicMatch },
    });

    if (controller.signal.aborted) {
      await finalizeCanceled(runId, run.searchId, userId, "canceled_during_scoring");
      return;
    }

    await setStatus(runId, "grouping");
    await setStatus(runId, "generating");

    const scoreByPostId = new Map(scoring.scores.map((s) => [s.postId, s.score]));
    const report = await generateReport(
      run.search.topic,
      createdPosts.map((p) => ({ id: p.id, text: p.text, authorHandle: p.authorHandle, url: p.url, score: scoreByPostId.get(p.id) ?? null })),
      aiBundle
    );

    await prisma.reportVersion.create({
      data: {
        runId,
        version: 1,
        executiveSummary: report.executiveSummary,
        themesJson: report.themes as unknown as Prisma.InputJsonValue,
        keyTakeawaysJson: report.keyTakeaways as unknown as Prisma.InputJsonValue,
        disagreementsJson: report.disagreements as unknown as Prisma.InputJsonValue,
        questionsJson: report.questions as unknown as Prisma.InputJsonValue,
        representativePostsJson: report.representativePosts as unknown as Prisma.InputJsonValue,
        limitations: report.limitations,
        scoredPostCount: scoring.scoredCount,
        generatedByProvider: aiBundle ? aiBundle.provider.id : "heuristic",
        generatedByModel: aiBundle ? aiBundle.config.model : "heuristic-v1",
      },
    });

    await recordAuditEvent({
      searchId: run.searchId,
      runId,
      userId,
      actorType: "system",
      action: "report_generated",
      outcome: report.source,
      metadata: { themeCount: report.themes.length },
    });

    await setStatus(runId, "saving");

    const finalStatus = searchResult.status === "partial" ? "partial" : "completed";
    await prisma.searchRun.update({
      where: { id: runId },
      data: {
        status: finalStatus,
        completedAt: new Date(),
        effectiveQuery: searchResult.effectiveQuery,
        retrievedCount: searchResult.retrievedCount,
        scoredCount: scoring.scoredCount,
        unscorableCount: scoring.unscorableCount,
        dedupClusterCount: similarity.clusterCount,
        similarContentPct: similarity.similarContentPct,
        similarityMethod: SIMILARITY_METHOD,
        similarityThreshold: SIMILARITY_THRESHOLD,
        coverageStart: searchResult.coverageStart ? new Date(searchResult.coverageStart) : undefined,
        coverageEnd: searchResult.coverageEnd ? new Date(searchResult.coverageEnd) : undefined,
        averageTopicMatch: scoring.averageTopicMatch ?? undefined,
        relevantPostsPct: scoring.relevantPostsPct ?? undefined,
        aiProvider: aiBundle ? aiBundle.provider.id : null,
        aiModel: aiBundle ? aiBundle.config.model : null,
        scoringRubricVersion: SCORING_RUBRIC_VERSION,
      },
    });

    await recordAuditEvent({
      searchId: run.searchId,
      runId,
      userId,
      actorType: "system",
      action: "run_completed",
      outcome: finalStatus,
      metadata: { retrievedCount: searchResult.retrievedCount, scoredCount: scoring.scoredCount },
    });
  } catch (err) {
    await prisma.searchRun.update({
      where: { id: runId },
      data: { status: "failed", errorMessage: err instanceof Error ? err.message : "Unknown error", completedAt: new Date() },
    });
    await recordAuditEvent({
      searchId: run.searchId,
      runId,
      userId,
      actorType: "system",
      action: "run_failed",
      outcome: "error",
      metadata: { message: err instanceof Error ? err.message : "Unknown error" },
    });
  } finally {
    unregisterRun(runId);
  }
}

async function finalizeCanceled(runId: string, searchId: string, userId: string, reason: string) {
  await prisma.searchRun.update({
    where: { id: runId },
    data: { status: "canceled", completedAt: new Date() },
  });
  await recordAuditEvent({
    searchId,
    runId,
    userId,
    actorType: "user",
    action: "run_canceled",
    outcome: "canceled",
    metadata: { reason },
  });
}

async function resolveAIBundle(userId: string): Promise<{ provider: AIProvider; config: AIProviderConfig } | null> {
  const aiConfig = await prisma.aIConfiguration.findUnique({ where: { userId } });
  if (!aiConfig || aiConfig.status !== "tested_ok" || !aiConfig.encryptedApiKey || !aiConfig.model) return null;
  return {
    provider: getAIProvider(aiConfig.provider),
    config: {
      apiKey: decryptSecret(aiConfig.encryptedApiKey),
      model: aiConfig.model,
      endpoint: aiConfig.endpointOverride ?? undefined,
      temperature: aiConfig.temperature ?? undefined,
      maxOutputTokens: aiConfig.maxOutputTokens ?? undefined,
    },
  };
}

// Recovers runs left in a non-terminal state by an unclean shutdown (Section 10:
// "recoverable status"). Call once at server startup.
export async function recoverStuckRuns(): Promise<number> {
  const cutoff = new Date(Date.now() - STUCK_RUN_TIMEOUT_MS);
  const stuck = await prisma.searchRun.findMany({
    where: { status: { notIn: [...TERMINAL_STATUSES] }, startedAt: { lt: cutoff } },
  });
  for (const run of stuck) {
    await prisma.searchRun.update({
      where: { id: run.id },
      data: { status: "failed", errorMessage: "Run did not complete before the server restarted.", errorCode: "stuck_recovered", completedAt: new Date() },
    });
    await recordAuditEvent({
      searchId: run.searchId,
      runId: run.id,
      actorType: "system",
      action: "run_recovered",
      outcome: "failed",
      metadata: { reason: "stuck_on_restart" },
    });
  }
  return stuck.length;
}
