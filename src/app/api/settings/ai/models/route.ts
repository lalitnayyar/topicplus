import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { assertSafeEndpoint } from "@/lib/ssrf";
import { getAIProvider } from "@/lib/providers/ai";
import { handleApiError } from "@/lib/apiError";

const schema = z.object({
  provider: z.enum(["ollama_cloud", "openai", "deepseek", "gemini"]),
  apiKey: z.string().optional(),
  endpointOverride: z.string().url().optional().or(z.literal("")),
});

// "Refresh models" — model discovery from the provider (Section 13).
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = schema.parse(await req.json());

    let apiKey = body.apiKey;
    if (!apiKey) {
      const saved = await prisma.aIConfiguration.findUnique({ where: { userId } });
      if (saved?.encryptedApiKey) apiKey = decryptSecret(saved.encryptedApiKey);
    }

    if (body.endpointOverride) await assertSafeEndpoint(body.endpointOverride);

    const provider = getAIProvider(body.provider);
    try {
      const models = await provider.listModels({ apiKey, model: "", endpoint: body.endpointOverride || undefined });
      return NextResponse.json({ models, source: "provider" });
    } catch {
      return NextResponse.json({ models: provider.fallbackModels, source: "fallback", warning: "Model discovery failed; showing a maintained fallback list." });
    }
  } catch (err) {
    return handleApiError(err);
  }
}
