import { createOpenAICompatibleProvider } from "./openaiCompatible";

// https://platform.openai.com/docs/api-reference — verify current models/pricing before relying on this list.
export const OpenAIProvider = createOpenAICompatibleProvider({
  id: "openai",
  label: "OpenAI",
  defaultEndpoint: "https://api.openai.com",
  supportsModelDiscovery: true,
  fallbackModels: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  authHeader: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
});
