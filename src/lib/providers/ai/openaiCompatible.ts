import { assertSafeEndpoint } from "@/lib/ssrf";
import type { AICompletionResult, AIProvider, AIProviderConfig } from "./types";
import { AIProviderError } from "./types";

interface OpenAICompatibleOptions {
  id: string;
  label: string;
  defaultEndpoint: string; // base URL, no trailing slash, no /v1
  supportsModelDiscovery: boolean;
  fallbackModels: string[];
  authHeader: (apiKey: string) => Record<string, string>;
}

async function resolveEndpoint(config: AIProviderConfig, fallback: string): Promise<string> {
  const base = config.endpoint?.trim() || fallback;
  if (config.endpoint?.trim()) await assertSafeEndpoint(base);
  return base.replace(/\/$/, "");
}

function classifyStatus(status: number): AIProviderError {
  if (status === 401 || status === 403) return new AIProviderError("invalid_key", "The API key was rejected.");
  if (status === 404) return new AIProviderError("unavailable_model", "The requested model was not found.");
  if (status === 402) return new AIProviderError("insufficient_credits", "The account has insufficient credits.");
  if (status === 429) return new AIProviderError("rate_limited", "Rate limit exceeded. Try again shortly.");
  if (status === 400) return new AIProviderError("unsupported_option", "The provider rejected one of the request options.");
  if (status >= 500) return new AIProviderError("network_error", "The provider reported a server error.");
  return new AIProviderError("unknown", `The provider returned HTTP ${status}.`);
}

export function createOpenAICompatibleProvider(opts: OpenAICompatibleOptions): AIProvider {
  return {
    id: opts.id,
    label: opts.label,
    defaultEndpoint: opts.defaultEndpoint,
    supportsModelDiscovery: opts.supportsModelDiscovery,
    fallbackModels: opts.fallbackModels,

    async listModels(config: AIProviderConfig): Promise<string[]> {
      if (!opts.supportsModelDiscovery) return opts.fallbackModels;
      if (!config.apiKey) throw new AIProviderError("invalid_key", "An API key is required to list models.");
      const base = await resolveEndpoint(config, opts.defaultEndpoint);
      const res = await fetch(`${base}/v1/models`, {
        headers: opts.authHeader(config.apiKey),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw classifyStatus(res.status);
      const json = (await res.json()) as { data?: { id: string }[] };
      const models = (json.data ?? []).map((m) => m.id);
      return models.length ? models : opts.fallbackModels;
    },

    async complete(config: AIProviderConfig, systemPrompt: string, userPrompt: string): Promise<AICompletionResult> {
      if (!config.apiKey) throw new AIProviderError("invalid_key", "An API key is required.");
      const base = await resolveEndpoint(config, opts.defaultEndpoint);
      let res: Response;
      try {
        res = await fetch(`${base}/v1/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...opts.authHeader(config.apiKey) },
          body: JSON.stringify({
            model: config.model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: config.temperature ?? 0.3,
            max_tokens: config.maxOutputTokens ?? 1024,
          }),
          signal: AbortSignal.timeout(60_000),
        });
      } catch (err) {
        if (err instanceof Error && err.name === "TimeoutError") {
          throw new AIProviderError("timeout", "The request to the AI provider timed out.");
        }
        throw new AIProviderError("network_error", "Could not reach the AI provider.");
      }
      if (!res.ok) throw classifyStatus(res.status);
      const json = (await res.json()) as {
        model?: string;
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content ?? "";
      return { text, requestedModel: config.model, providerReportedModel: json.model, raw: json };
    },

    async testConnection(config) {
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
}
