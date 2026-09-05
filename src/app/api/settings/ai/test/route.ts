import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { assertSafeEndpoint } from "@/lib/ssrf";
import { getAIProvider } from "@/lib/providers/ai";
import { recordAuditEvent } from "@/lib/audit";
import { handleApiError } from "@/lib/apiError";
import { tryAcquireTestLock, releaseTestLock } from "@/lib/testLock";

const testSchema = z.object({
  provider: z.enum(["ollama_cloud", "openai", "deepseek", "gemini"]),
  apiKey: z.string().optional(), // omitted = use saved key
  model: z.string().min(1),
  endpointOverride: z.string().url().optional().or(z.literal("")),
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.number().int().min(1).max(32000).optional(),
});

// Sends one minimal, harmless, fixed-prompt inference request with a small response
// budget. Never sends collected posts or search history (Section 13).
export async function POST(req: NextRequest) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lockKey = `ai:${userId}`;
  if (!tryAcquireTestLock(lockKey)) {
    return NextResponse.json({ error: "A connection test is already running for this configuration" }, { status: 409 });
  }

  try {
    const body = testSchema.parse(await req.json());

    let apiKey = body.apiKey;
    if (!apiKey) {
      const saved = await prisma.aIConfiguration.findUnique({ where: { userId } });
      if (!saved?.encryptedApiKey) {
        return NextResponse.json({ error: "No API key to test — enter one or save a configuration first" }, { status: 400 });
      }
      apiKey = decryptSecret(saved.encryptedApiKey);
    }

    if (body.endpointOverride) await assertSafeEndpoint(body.endpointOverride);

    const provider = getAIProvider(body.provider);
    const result = await provider.testConnection({
      apiKey,
      model: body.model,
      endpoint: body.endpointOverride || undefined,
      temperature: body.temperature,
      maxOutputTokens: Math.min(body.maxOutputTokens ?? 32, 32),
    });

    const status = result.authOk && result.inferenceOk ? "tested_ok" : "tested_failed";
    const existing = await prisma.aIConfiguration.findUnique({ where: { userId } });
    if (existing) {
      await prisma.aIConfiguration.update({
        where: { userId },
        data: { lastTestedAt: new Date(), lastTestResultJson: result as unknown as Prisma.InputJsonValue, status: existing.encryptedApiKey ? status : existing.status },
      });
    }

    await recordAuditEvent({
      userId,
      actorType: "user",
      action: "ai_config_tested",
      outcome: status,
      metadata: { provider: body.provider, model: body.model, authOk: result.authOk, inferenceOk: result.inferenceOk, errorCode: result.errorCode },
    });

    return NextResponse.json({ result, readyForLiveAnalysis: status === "tested_ok" });
  } catch (err) {
    return handleApiError(err);
  } finally {
    releaseTestLock(lockKey);
  }
}
