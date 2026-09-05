import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { recordAuditEvent } from "@/lib/audit";
import { handleApiError } from "@/lib/apiError";

export async function GET() {
  try {
    const userId = await requireUserId();
    const conn = await prisma.xConnectionSettings.findUnique({ where: { userId } });
    return NextResponse.json({
      connection: conn
        ? {
            provider: conn.provider,
            status: conn.status,
            configured: !!conn.encryptedCredentials,
            savedAt: conn.savedAt,
            lastTestedAt: conn.lastTestedAt,
            lastTestResult: conn.lastTestResultJson,
          }
        : { provider: "x_api_v2", status: "not_configured", configured: false, savedAt: null, lastTestedAt: null, lastTestResult: null },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const saveSchema = z.object({
  provider: z.literal("x_api_v2"),
  bearerToken: z.string().min(10),
});

// Save connection (Section 13: "Save connection", "Never return an existing saved
// secret to the browser").
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = saveSchema.parse(await req.json());

    const existing = await prisma.xConnectionSettings.findUnique({ where: { userId } });
    const configVersion = (existing?.configVersion ?? 0) + 1;

    await prisma.xConnectionSettings.upsert({
      where: { userId },
      create: {
        userId,
        provider: body.provider,
        encryptedCredentials: encryptSecret(body.bearerToken),
        status: "saved",
        savedAt: new Date(),
        configVersion,
      },
      update: {
        provider: body.provider,
        encryptedCredentials: encryptSecret(body.bearerToken),
        status: "saved",
        savedAt: new Date(),
        lastTestedAt: null,
        configVersion,
      },
    });

    await recordAuditEvent({ userId, actorType: "user", action: "x_connection_saved", outcome: "ok", metadata: { provider: body.provider } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE() {
  try {
    const userId = await requireUserId();
    await prisma.xConnectionSettings.upsert({
      where: { userId },
      create: { userId, provider: "x_api_v2", status: "not_configured" },
      update: { encryptedCredentials: null, status: "not_configured", savedAt: null, lastTestedAt: null },
    });

    await recordAuditEvent({ userId, actorType: "user", action: "x_connection_disconnected", outcome: "ok" });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
