import { createOpenAICompatibleProvider } from "./openaiCompatible";

// Ollama Cloud — OpenAI-compatible endpoint at https://ollama.com/v1 (see
// https://docs.ollama.com/api/openai-compatibility). This is the preferred default
// AI provider (Section 13). Verify current model availability via listModels rather
// than assuming this fallback list is exhaustive or current.
export const OllamaCloudProvider = createOpenAICompatibleProvider({
  id: "ollama_cloud",
  label: "Ollama Cloud",
  defaultEndpoint: "https://ollama.com",
  supportsModelDiscovery: true,
  fallbackModels: ["llama3.3:70b", "qwen3:32b", "deepseek-v3.1:671b"],
  authHeader: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
});
