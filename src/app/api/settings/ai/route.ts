import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { encryptSecret, maskSecret } from "@/lib/crypto";
import { assertSafeEndpoint } from "@/lib/ssrf";
import { AI_PROVIDERS, DEFAULT_AI_PROVIDER_ID } from "@/lib/providers/ai";
import { recordAuditEvent } from "@/lib/audit";
import { handleApiError } from "@/lib/apiError";

export async function GET() {
  try {
    const userId = await requireUserId();
    const conn = await prisma.aIConfiguration.findUnique({ where: { userId } });

    return NextResponse.json({
      providers: Object.values(AI_PROVIDERS).map((p) => ({
        id: p.id,
        label: p.label,
        defaultEndpoint: p.defaultEndpoint,
        supportsModelDiscovery: p.supportsModelDiscovery,
        fallbackModels: p.fallbackModels,
      })),
      defaultProvider: DEFAULT_AI_PROVIDER_ID,
      config: conn
        ? {
            provider: conn.provider,
            model: conn.model,
            endpointOverride: conn.endpointOverride,
            temperature: conn.temperature,
            maxOutputTokens: conn.maxOutputTokens,
            status: conn.status,
            configured: !!conn.encryptedApiKey,
            maskedKeyHint: conn.maskedKeyHint,
            savedAt: conn.savedAt,
            lastTestedAt: conn.lastTestedAt,
            lastTestResult: conn.lastTestResultJson,
          }
        : { provider: DEFAULT_AI_PROVIDER_ID, model: null, status: "not_configured", configured: false },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const saveSchema = z.object({
  provider: z.enum(["ollama_cloud", "openai", "deepseek", "gemini"]),
  apiKey: z.string().optional(), // undefined = leave unchanged, "" = remove
  model: z.string().min(1).max(200),
  endpointOverride: z.string().url().optional().or(z.literal("")),
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.number().int().min(1).max(32000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = saveSchema.parse(await req.json());

    if (body.endpointOverride) {
      await assertSafeEndpoint(body.endpointOverride);
    }

    const existing = await prisma.aIConfiguration.findUnique({ where: { userId } });
    const configVersion = (existing?.configVersion ?? 0) + 1;

    let encryptedApiKey = existing?.encryptedApiKey ?? null;
    let maskedKeyHint = existing?.maskedKeyHint ?? null;
    if (body.apiKey === "") {
      encryptedApiKey = null;
      maskedKeyHint = null;
    } else if (body.apiKey) {
      encryptedApiKey = encryptSecret(body.apiKey);
      maskedKeyHint = maskSecret(body.apiKey);
    }

    await prisma.aIConfiguration.upsert({
      where: { userId },
      create: {
        userId,
        provider: body.provider,
        encryptedApiKey,
        maskedKeyHint,
        model: body.model,
        endpointOverride: body.endpointOverride || null,
        temperature: body.temperature,
        maxOutputTokens: body.maxOutputTokens,
        status: "saved",
        savedAt: new Date(),
        configVersion,
      },
      update: {
        provider: body.provider,
        encryptedApiKey,
        maskedKeyHint,
        model: body.model,
        endpointOverride: body.endpointOverride || null,
        temperature: body.temperature,
        maxOutputTokens: body.maxOutputTokens,
        status: "saved",
        savedAt: new Date(),
        lastTestedAt: null,
        configVersion,
      },
    });

    await recordAuditEvent({ userId, actorType: "user", action: "ai_config_saved", outcome: "ok", metadata: { provider: body.provider, model: body.model } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE() {
  try {
    const userId = await requireUserId();
    await prisma.aIConfiguration.upsert({
      where: { userId },
      create: { userId, provider: DEFAULT_AI_PROVIDER_ID, status: "not_configured" },
      update: {
        encryptedApiKey: null,
        maskedKeyHint: null,
        status: "not_configured",
        savedAt: null,
        lastTestedAt: null,
      },
    });

    await recordAuditEvent({ userId, actorType: "user", action: "ai_config_disconnected", outcome: "ok" });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
