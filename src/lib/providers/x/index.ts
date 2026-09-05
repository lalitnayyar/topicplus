import { DemoXProvider } from "./demo";
import { XApiV2Provider } from "./xapi";
import type { XProvider } from "./types";

export const X_PROVIDERS: Record<string, XProvider> = {
  demo: DemoXProvider,
  x_api_v2: XApiV2Provider,
};

export function getXProvider(id: string): XProvider {
  const provider = X_PROVIDERS[id];
  if (!provider) throw new Error(`Unknown X provider: ${id}`);
  return provider;
}

export * from "./types";
