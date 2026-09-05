import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { handleApiError } from "@/lib/apiError";
import { runSearchPipeline } from "@/lib/jobs/runSearch";

const filtersSchema = z.object({
  language: z.string().max(10).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeReplies: z.boolean().default(false),
  includeReposts: z.boolean().default(false),
});

const createSchema = z.object({
  topic: z.string().trim().min(2, "Enter at least 2 characters").max(280),
  filters: filtersSchema.default({ includeReplies: false, includeReposts: false }),
  requestedCount: z.number().int().min(1).max(100).default(100),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = createSchema.parse(await req.json());

    const xConn = await prisma.xConnectionSettings.findUnique({ where: { userId } });
    const provider = xConn?.status === "tested_ok" && xConn.encryptedCredentials ? xConn.provider : "demo";

    const search = await prisma.search.create({
      data: { userId, topic: body.topic, name: body.topic },
    });

    const run = await prisma.searchRun.create({
      data: {
        searchId: search.id,
        status: "pending",
        isDemo: provider === "demo",
        provider,
        effectiveQuery: body.topic,
        filtersJson: body.filters,
        requestedCount: body.requestedCount,
      },
    });

    await recordAuditEvent({
      searchId: search.id,
      runId: run.id,
      userId,
      actorType: "user",
      action: "search_submitted",
      outcome: "accepted",
      metadata: { topic: body.topic, filters: body.filters, provider },
    });

    void runSearchPipeline(run.id).catch((err) => console.error("runSearchPipeline failed", err));

    return NextResponse.json({ searchId: search.id, runId: run.id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const favoriteOnly = searchParams.get("favorite") === "true";

    const searches = await prisma.search.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(q ? { topic: { contains: q } } : {}),
        ...(favoriteOnly ? { isFavorite: true } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json({
      searches: searches.map((s) => ({
        id: s.id,
        topic: s.topic,
        name: s.name,
        isFavorite: s.isFavorite,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        latestRun: s.runs[0]
          ? {
              id: s.runs[0].id,
              status: s.runs[0].status,
              retrievedCount: s.runs[0].retrievedCount,
              averageTopicMatch: s.runs[0].averageTopicMatch,
              relevantPostsPct: s.runs[0].relevantPostsPct,
              similarContentPct: s.runs[0].similarContentPct,
              startedAt: s.runs[0].startedAt,
              completedAt: s.runs[0].completedAt,
            }
          : null,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
