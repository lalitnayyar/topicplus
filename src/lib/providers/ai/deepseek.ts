import { createOpenAICompatibleProvider } from "./openaiCompatible";

// https://api-docs.deepseek.com — OpenAI-compatible chat completions API.
export const DeepSeekProvider = createOpenAICompatibleProvider({
  id: "deepseek",
  label: "DeepSeek",
  defaultEndpoint: "https://api.deepseek.com",
  supportsModelDiscovery: true,
  fallbackModels: ["deepseek-chat", "deepseek-reasoner"],
  authHeader: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
});
