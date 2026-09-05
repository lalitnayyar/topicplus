import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getOwnedRun } from "@/lib/ownership";
import { handleApiError } from "@/lib/apiError";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    await getOwnedRun(id, userId);

    const events = await prisma.auditEvent.findMany({
      where: { runId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ events });
  } catch (err) {
    return handleApiError(err);
  }
}
