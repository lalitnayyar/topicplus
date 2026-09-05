import { assertSafeEndpoint } from "@/lib/ssrf";
import type { AICompletionResult, AIConnectionTestResult, AIProvider, AIProviderConfig } from "./types";
import { AIProviderError } from "./types";

// https://ai.google.dev/api — Google Generative Language API.
const DEFAULT_ENDPOINT = "https://generativelanguage.googleapis.com";

async function resolveEndpoint(config: AIProviderConfig): Promise<string> {
  const base = config.endpoint?.trim() || DEFAULT_ENDPOINT;
  if (config.endpoint?.trim()) await assertSafeEndpoint(base);
  return base.replace(/\/$/, "");
}

function classifyStatus(status: number): AIProviderError {
  if (status === 401 || status === 403) return new AIProviderError("invalid_key", "The API key was rejected.");
  if (status === 404) return new AIProviderError("unavailable_model", "The requested model was not found.");
  if (status === 429) return new AIProviderError("rate_limited", "Rate limit exceeded. Try again shortly.");
  if (status === 400) return new AIProviderError("unsupported_option", "The provider rejected one of the request options.");
  if (status >= 500) return new AIProviderError("network_error", "The provider reported a server error.");
  return new AIProviderError("unknown", `The provider returned HTTP ${status}.`);
}

export const GeminiProvider: AIProvider = {
  id: "gemini",
  label: "Google Gemini",
  defaultEndpoint: DEFAULT_ENDPOINT,
  supportsModelDiscovery: true,
  fallbackModels: ["gemini-2.0-flash", "gemini-2.0-pro"],

  async listModels(config) {
    if (!config.apiKey) throw new AIProviderError("invalid_key", "An API key is required to list models.");
    const base = await resolveEndpoint(config);
    const res = await fetch(`${base}/v1beta/models?key=${encodeURIComponent(config.apiKey)}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw classifyStatus(res.status);
    const json = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    const models = (json.models ?? [])
      .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""));
    return models.length ? models : this.fallbackModels;
  },

  async complete(config, systemPrompt, userPrompt): Promise<AICompletionResult> {
    if (!config.apiKey) throw new AIProviderError("invalid_key", "An API key is required.");
    const base = await resolveEndpoint(config);
    let res: Response;
    try {
      res = await fetch(
        `${base}/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: config.temperature ?? 0.3,
              maxOutputTokens: config.maxOutputTokens ?? 1024,
            },
          }),
          signal: AbortSignal.timeout(60_000),
        }
      );
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new AIProviderError("timeout", "The request to the AI provider timed out.");
      }
      throw new AIProviderError("network_error", "Could not reach the AI provider.");
    }
    if (!res.ok) throw classifyStatus(res.status);
    const json = (await res.json()) as {
      modelVersion?: string;
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return { text, requestedModel: config.model, providerReportedModel: json.modelVersion, raw: json };
  },

  async testConnection(config): Promise<AIConnectionTestResult> {
    const startedAt = Date.now();
    const testedAt = new Date().toISOString();
    try {
      const result = await this.complete(
        config,
        "You are a connectivity test. Reply with exactly one word.",
        "Reply with the single word: ready."
      );
      return {
        authOk: true,
        inferenceOk: true,
        requestedModel: config.model,
        providerReportedModel: result.providerReportedModel,
        responseTimeMs: Date.now() - startedAt,
        sampleText: result.text.slice(0, 200),
        testedAt,
      };
    } catch (err) {
      const providerErr = err instanceof AIProviderError ? err : new AIProviderError("unknown", "Unknown error");
      return {
        authOk: providerErr.code !== "invalid_key",
        inferenceOk: false,
        requestedModel: config.model,
        responseTimeMs: Date.now() - startedAt,
        errorCode: providerErr.code,
        errorMessage: providerErr.message,
        testedAt,
      };
    }
  },
};
