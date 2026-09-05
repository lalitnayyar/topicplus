import { OpenAIProvider } from "./openai";
import { OllamaCloudProvider } from "./ollamaCloud";
import { DeepSeekProvider } from "./deepseek";
import { GeminiProvider } from "./gemini";
import type { AIProvider } from "./types";

export const AI_PROVIDERS: Record<string, AIProvider> = {
  ollama_cloud: OllamaCloudProvider,
  openai: OpenAIProvider,
  deepseek: DeepSeekProvider,
  gemini: GeminiProvider,
};

// Ollama Cloud is the preferred default (Section 13).
export const DEFAULT_AI_PROVIDER_ID = "ollama_cloud";

export function getAIProvider(id: string): AIProvider {
  const provider = AI_PROVIDERS[id];
  if (!provider) throw new Error(`Unknown AI provider: ${id}`);
  return provider;
}

export * from "./types";
