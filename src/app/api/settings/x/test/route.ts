import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { getXProvider } from "@/lib/providers/x";
import { recordAuditEvent } from "@/lib/audit";
import { handleApiError } from "@/lib/apiError";
import { tryAcquireTestLock, releaseTestLock } from "@/lib/testLock";

const testSchema = z.object({
  provider: z.literal("x_api_v2").default("x_api_v2"),
  bearerToken: z.string().min(10).optional(),
});

// Tests the CURRENTLY ENTERED configuration (including unsaved changes) without
// silently saving it. If no token is provided in the request, the already-saved
// credential is tested instead (Section 13).
export async function POST(req: NextRequest) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lockKey = `x:${userId}`;
  if (!tryAcquireTestLock(lockKey)) {
    return NextResponse.json({ error: "A connection test is already running for this configuration" }, { status: 409 });
  }

  try {
    const body = testSchema.parse(await req.json().catch(() => ({})));

    let bearerToken = body.bearerToken;
    if (!bearerToken) {
      const saved = await prisma.xConnectionSettings.findUnique({ where: { userId } });
      if (!saved?.encryptedCredentials) {
        return NextResponse.json({ error: "No credential to test — enter one or save a connection first" }, { status: 400 });
      }
      bearerToken = decryptSecret(saved.encryptedCredentials);
    }

    const provider = getXProvider(body.provider);
    const result = await provider.testConnection({ bearerToken });

    const existing = await prisma.xConnectionSettings.findUnique({ where: { userId } });
    // A successful authentication check alone must not be reported as full search
    // readiness — status only flips to tested_ok when BOTH authOk and searchOk pass.
    const status = result.authOk && result.searchOk ? "tested_ok" : "tested_failed";

    if (existing) {
      await prisma.xConnectionSettings.update({
        where: { userId },
        data: { lastTestedAt: new Date(), lastTestResultJson: result as unknown as Prisma.InputJsonValue, status: existing.encryptedCredentials ? status : existing.status },
      });
    }

    await recordAuditEvent({
      userId,
      actorType: "user",
      action: "x_connection_tested",
      outcome: status,
      metadata: { authOk: result.authOk, searchOk: result.searchOk, errorCode: result.errorCode },
    });

    return NextResponse.json({ result, readyForLiveAnalysis: status === "tested_ok" });
  } catch (err) {
    return handleApiError(err);
  } finally {
    releaseTestLock(lockKey);
  }
}
