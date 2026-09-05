import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getOwnedRun } from "@/lib/ownership";
import { recordAuditEvent } from "@/lib/audit";
import { handleApiError } from "@/lib/apiError";
import { prisma } from "@/lib/db";
import { cancelRun, isRunActive } from "@/lib/jobs/registry";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const run = await getOwnedRun(id, userId);

    const terminal = ["completed", "partial", "failed", "canceled"];
    if (terminal.includes(run.status)) {
      return NextResponse.json({ ok: false, message: "Run has already finished" }, { status: 409 });
    }

    await prisma.searchRun.update({ where: { id }, data: { cancelRequested: true } });

    const wasActive = isRunActive(id);
    if (wasActive) cancelRun(id);
    else {
      // Not currently in-process (e.g. lost on a restart before recovery ran) —
      // mark canceled directly.
      await prisma.searchRun.update({ where: { id }, data: { status: "canceled", completedAt: new Date() } });
    }

    await recordAuditEvent({
      searchId: run.searchId,
      runId: id,
      userId,
      actorType: "user",
      action: "run_cancel_requested",
      outcome: wasActive ? "accepted" : "canceled",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
