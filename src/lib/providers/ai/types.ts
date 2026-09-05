export interface AIProviderConfig {
  apiKey?: string;
  model: string;
  endpoint?: string; // advanced override, SSRF-checked before use
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AICompletionResult {
  text: string;
  requestedModel: string;
  providerReportedModel?: string;
  raw?: unknown;
}

export type AIErrorCode =
  | "invalid_key"
  | "unavailable_model"
  | "unsupported_option"
  | "insufficient_credits"
  | "rate_limited"
  | "network_error"
  | "timeout"
  | "unknown";

export class AIProviderError extends Error {
  code: AIErrorCode;
  constructor(code: AIErrorCode, message: string) {
    super(message);
    this.name = "AIProviderError";
    this.code = code;
  }
}

export interface AIConnectionTestResult {
  authOk: boolean;
  inferenceOk: boolean;
  requestedModel: string;
  providerReportedModel?: string;
  responseTimeMs: number;
  sampleText?: string;
  errorCode?: AIErrorCode;
  errorMessage?: string;
  testedAt: string;
}

export interface AIProvider {
  id: string;
  label: string;
  defaultEndpoint: string;
  supportsModelDiscovery: boolean;
  fallbackModels: string[];
  listModels(config: AIProviderConfig): Promise<string[]>;
  complete(config: AIProviderConfig, systemPrompt: string, userPrompt: string): Promise<AICompletionResult>;
  testConnection(config: AIProviderConfig): Promise<AIConnectionTestResult>;
}
