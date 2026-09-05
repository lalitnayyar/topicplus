import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getOwnedSearch } from "@/lib/ownership";
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

const rerunSchema = z.object({
  filters: filtersSchema.optional(),
  requestedCount: z.number().int().min(1).max(100).default(100),
});

// "Run again" creates a new linked run, preserving the previous run (Section 7).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const search = await getOwnedSearch(id, userId);

    const raw = await req.text();
    const body = rerunSchema.parse(raw ? JSON.parse(raw) : {});

    const previousRun = await prisma.searchRun.findFirst({ where: { searchId: id }, orderBy: { startedAt: "desc" } });
    const filters = body.filters ?? (previousRun?.filtersJson as z.infer<typeof filtersSchema>) ?? { includeReplies: false, includeReposts: false };

    const xConn = await prisma.xConnectionSettings.findUnique({ where: { userId } });
    const provider = xConn?.status === "tested_ok" && xConn.encryptedCredentials ? xConn.provider : "demo";

    const run = await prisma.searchRun.create({
      data: {
        searchId: id,
        parentRunId: previousRun?.id,
        status: "pending",
        isDemo: provider === "demo",
        provider,
        effectiveQuery: search.topic,
        filtersJson: filters,
        requestedCount: body.requestedCount,
      },
    });

    await prisma.search.update({ where: { id }, data: { updatedAt: new Date() } });

    await recordAuditEvent({
      searchId: id,
      runId: run.id,
      userId,
      actorType: "user",
      action: "search_rerun",
      outcome: "accepted",
      metadata: { previousRunId: previousRun?.id, filters, provider },
    });

    void runSearchPipeline(run.id).catch((err) => console.error("runSearchPipeline failed", err));

    return NextResponse.json({ runId: run.id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
