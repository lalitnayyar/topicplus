import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getOwnedRun } from "@/lib/ownership";
import { handleApiError } from "@/lib/apiError";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const run = await getOwnedRun(id, userId);

    const [posts, scores, clusters, reportVersions, postsSoFar, scoresSoFar] = await Promise.all([
      prisma.collectedPost.findMany({ where: { runId: id }, orderBy: { postedAt: "desc" } }),
      prisma.relevanceScore.findMany({ where: { runId: id } }),
      prisma.duplicateCluster.findMany({ where: { runId: id } }),
      prisma.reportVersion.findMany({ where: { runId: id }, orderBy: { version: "desc" } }),
      prisma.collectedPost.count({ where: { runId: id } }),
      prisma.relevanceScore.count({ where: { runId: id } }),
    ]);

    const scoreByPostId = new Map(scores.map((s) => [s.postId, s]));

    return NextResponse.json({
      run,
      search: run.search,
      posts: posts.map((p) => ({
        ...p,
        score: scoreByPostId.get(p.id) ?? null,
      })),
      duplicateClusters: clusters,
      report: reportVersions[0] ?? null,
      reportVersions: reportVersions.map((r) => ({ id: r.id, version: r.version, createdAt: r.createdAt })),
      progress: { postsSoFar, scoresSoFar },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
