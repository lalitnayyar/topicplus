import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getOwnedRun } from "@/lib/ownership";
import { recordAuditEvent } from "@/lib/audit";
import { handleApiError } from "@/lib/apiError";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/csv";

const FORMATS = ["txt", "md", "csv", "json"] as const;
type Format = (typeof FORMATS)[number];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const run = await getOwnedRun(id, userId);
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") ?? "json") as Format;
    if (!FORMATS.includes(format)) {
      return NextResponse.json({ error: `format must be one of ${FORMATS.join(", ")}` }, { status: 400 });
    }

    const [posts, scores, report] = await Promise.all([
      prisma.collectedPost.findMany({ where: { runId: id }, orderBy: { postedAt: "desc" } }),
      prisma.relevanceScore.findMany({ where: { runId: id } }),
      prisma.reportVersion.findFirst({ where: { runId: id }, orderBy: { version: "desc" } }),
    ]);
    const scoreByPostId = new Map(scores.map((s) => [s.postId, s]));

    const meta = {
      topic: run.search.topic,
      filters: run.filtersJson,
      provider: run.provider,
      isDemo: run.isDemo,
      retrievedAt: run.startedAt,
      coverageStart: run.coverageStart,
      coverageEnd: run.coverageEnd,
      requestedCount: run.requestedCount,
      retrievedCount: run.retrievedCount,
      scoredCount: run.scoredCount,
      unscorableCount: run.unscorableCount,
      similarContentPct: run.similarContentPct,
      averageTopicMatch: run.averageTopicMatch,
      relevantPostsPct: run.relevantPostsPct,
      status: run.status,
      limitations: report?.limitations ?? null,
    };

    await recordAuditEvent({
      searchId: run.searchId,
      runId: id,
      userId,
      actorType: "user",
      action: "export_created",
      outcome: "ok",
      metadata: { format },
    });

    if (format === "json") {
      return NextResponse.json({ meta, posts: posts.map((p) => ({ ...p, score: scoreByPostId.get(p.id) ?? null })), report });
    }

    if (format === "csv") {
      const headers = ["postId", "authorHandle", "authorName", "postedAt", "url", "topicMatchScore", "isScorable", "text"];
      const rows = posts.map((p) => {
        const s = scoreByPostId.get(p.id);
        return [p.postId, p.authorHandle, p.authorName, p.postedAt.toISOString(), p.url, s?.score ?? "", s?.isScorable ?? "", p.text];
      });
      const csv = `# TopicPulse export — topic: ${meta.topic} | status: ${meta.status} | retrieved: ${meta.retrievedCount} | scored: ${meta.scoredCount} | similar content: ${meta.similarContentPct ?? "n/a"}%\r\n${toCsv(headers, rows)}`;
      return new NextResponse(csv, {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="topicpulse-${id}.csv"` },
      });
    }

    const bodyLines: string[] = [];
    bodyLines.push(`TopicPulse export — ${meta.topic}`);
    bodyLines.push(`Status: ${meta.status} | Provider: ${meta.provider}${meta.isDemo ? " (demo mode)" : ""}`);
    bodyLines.push(`Retrieved ${meta.retrievedCount} of ${meta.requestedCount} requested | Scored ${meta.scoredCount} | Unscorable ${meta.unscorableCount}`);
    bodyLines.push(`Coverage: ${meta.coverageStart ?? "n/a"} to ${meta.coverageEnd ?? "n/a"}`);
    bodyLines.push(`Average Topic Match: ${meta.averageTopicMatch ?? "Not available"} | Relevant Posts: ${meta.relevantPostsPct ?? "Not available"}%`);
    bodyLines.push(`Similar Content: ${meta.similarContentPct ?? "n/a"}%`);
    bodyLines.push(`Limitations: ${meta.limitations ?? "None recorded"}`);
    bodyLines.push("");
    bodyLines.push(format === "md" ? "## All extracted text" : "ALL EXTRACTED TEXT");
    posts.forEach((p, i) => {
      const s = scoreByPostId.get(p.id);
      bodyLines.push("");
      bodyLines.push(
        format === "md"
          ? `**${i + 1}. ${p.authorName} (@${p.authorHandle})** — ${p.postedAt.toISOString()} — [source](${p.url}) — Topic Match: ${s?.score ?? "n/a"}`
          : `${i + 1}. ${p.authorName} (@${p.authorHandle}) — ${p.postedAt.toISOString()} — ${p.url} — Topic Match: ${s?.score ?? "n/a"}`
      );
      bodyLines.push(p.text);
    });

    const content = bodyLines.join("\n");
    const contentType = format === "md" ? "text/markdown; charset=utf-8" : "text/plain; charset=utf-8";
    return new NextResponse(content, {
      headers: { "Content-Type": contentType, "Content-Disposition": `attachment; filename="topicpulse-${id}.${format}"` },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
