import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getOwnedSearch } from "@/lib/ownership";
import { recordAuditEvent } from "@/lib/audit";
import { handleApiError } from "@/lib/apiError";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const search = await getOwnedSearch(id, userId);
    const runs = await prisma.searchRun.findMany({
      where: { searchId: id },
      orderBy: { startedAt: "desc" },
    });
    return NextResponse.json({ search, runs });
  } catch (err) {
    return handleApiError(err);
  }
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  isFavorite: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    await getOwnedSearch(id, userId);
    const body = patchSchema.parse(await req.json());

    const updated = await prisma.search.update({ where: { id }, data: body });

    if (body.name !== undefined) {
      await recordAuditEvent({ searchId: id, userId, actorType: "user", action: "search_renamed", outcome: "ok", metadata: { name: body.name } });
    }
    if (body.isFavorite !== undefined) {
      await recordAuditEvent({ searchId: id, userId, actorType: "user", action: "search_favorited", outcome: "ok", metadata: { isFavorite: body.isFavorite } });
    }

    return NextResponse.json({ search: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    await getOwnedSearch(id, userId);

    await prisma.search.update({ where: { id }, data: { deletedAt: new Date() } });
    await recordAuditEvent({ searchId: id, userId, actorType: "user", action: "search_deleted", outcome: "ok" });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
