"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "./StatusBadge";

interface ProviderInfo {
  id: string;
  label: string;
  defaultEndpoint: string;
  supportsModelDiscovery: boolean;
  fallbackModels: string[];
}

interface AITestResult {
  authOk: boolean;
  inferenceOk: boolean;
  requestedModel: string;
  providerReportedModel?: string;
  responseTimeMs: number;
  sampleText?: string;
  errorCode?: string;
  errorMessage?: string;
  testedAt: string;
}

interface AIState {
  provider: string;
  model: string | null;
  endpointOverride: string | null;
  temperature: number | null;
  maxOutputTokens: number | null;
  status: string;
  configured: boolean;
  maskedKeyHint: string | null;
  savedAt: string | null;
  lastTestedAt: string | null;
  lastTestResult: AITestResult | null;
}

export function AIConfigPanel() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [defaultProvider, setDefaultProvider] = useState("ollama_cloud");
  const [state, setState] = useState<AIState | null>(null);

  const [provider, setProvider] = useState("ollama_cloud");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [endpointOverride, setEndpointOverride] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState<string>("");
  const [maxOutputTokens, setMaxOutputTokens] = useState<string>("");

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/settings/ai");
    if (!res.ok) return;
    const body = await res.json();
    setProviders(body.providers);
    setDefaultProvider(body.defaultProvider);
    setState(body.config);
    setProvider(body.config.provider ?? body.defaultProvider);
    setModel(body.config.model ?? "");
    setEndpointOverride(body.config.endpointOverride ?? "");
    setTemperature(body.config.temperature?.toString() ?? "");
    setMaxOutputTokens(body.config.maxOutputTokens?.toString() ?? "");
    setModels(body.providers.find((p: ProviderInfo) => p.id === (body.config.provider ?? body.defaultProvider))?.fallbackModels ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  const currentProviderInfo = providers.find((p) => p.id === provider);

  async function refreshModels() {
    setRefreshingModels(true);
    setMessage(null);
    const res = await fetch("/api/settings/ai/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey: apiKey || undefined, endpointOverride: endpointOverride || undefined }),
    });
    setRefreshingModels(false);
    const body = await res.json().catch(() => ({ models: [] }));
    setModels(body.models ?? []);
    if (body.warning) setMessage(body.warning);
  }

  async function save() {
    if (!model) {
      setMessage("Choose or enter a model.");
      return;
    }
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        apiKey: apiKey || undefined,
        model,
        endpointOverride: endpointOverride || undefined,
        temperature: temperature ? Number(temperature) : undefined,
        maxOutputTokens: maxOutputTokens ? Number(maxOutputTokens) : undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Configuration saved.");
      setDirty(false);
      setApiKey("");
      load();
    } else {
      const body = await res.json().catch(() => ({}));
      setMessage(body.error ?? "Could not save configuration.");
    }
  }

  async function test() {
    if (!model) {
      setMessage("Choose or enter a model before testing.");
      return;
    }
    setTesting(true);
    setMessage(null);
    const res = await fetch("/api/settings/ai/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        apiKey: apiKey || undefined,
        model,
        endpointOverride: endpointOverride || undefined,
        temperature: temperature ? Number(temperature) : undefined,
      }),
    });
    setTesting(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(body.error ?? "Test failed.");
      return;
    }
    setDirty(false);
    load();
  }

  async function removeKey() {
    setApiKey("");
    setSaving(true);
    await fetch("/api/settings/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey: "", model: model || "placeholder" }),
    });
    setSaving(false);
    load();
  }

  async function disconnect() {
    if (!confirm("Disconnect the AI configuration? Saved reports keep their original metadata.")) return;
    await fetch("/api/settings/ai", { method: "DELETE" });
    setApiKey("");
    setDirty(false);
    load();
  }

  function markDirty() {
    setDirty(true);
  }

  if (!state) return <div className="tp-shimmer h-64 rounded-2xl border border-border" />;

  const result = state.lastTestResult;

  return (
    <section className="tp-animate-in rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">AI Configuration</h2>
        <StatusBadge status={state.status} dirty={dirty} />
      </div>
      <p className="mt-1 text-sm text-foreground-muted">
        Preferred provider: <span className="font-medium text-foreground">Ollama Cloud</span> (selected by default). Model availability is verified live via the provider.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ai-provider" className="mb-1 block text-sm font-medium text-foreground">
            AI provider
          </label>
          <select
            id="ai-provider"
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              setModel("");
              setModels(providers.find((p) => p.id === e.target.value)?.fallbackModels ?? []);
              markDirty();
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary-400"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
                {p.id === defaultProvider ? " (preferred default)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ai-key" className="mb-1 block text-sm font-medium text-foreground">
            API key
          </label>
          <input
            id="ai-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              markDirty();
            }}
            placeholder={state.maskedKeyHint ?? "Enter API key"}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary-400"
          />
          {state.configured && (
            <button type="button" onClick={removeKey} className="mt-1 text-xs font-medium text-danger-500 hover:underline">
              Remove saved key
            </button>
          )}
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between">
            <label htmlFor="ai-model" className="mb-1 block text-sm font-medium text-foreground">
              Model / LLM
            </label>
            {currentProviderInfo?.supportsModelDiscovery && (
              <button type="button" onClick={refreshModels} disabled={refreshingModels} className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-60">
                {refreshingModels ? "Refreshing…" : "Refresh models"}
              </button>
            )}
          </div>
          <input
            id="ai-model"
            list="ai-model-options"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              markDirty();
            }}
            placeholder="Select or type a model identifier"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary-400"
          />
          <datalist id="ai-model-options">
            {models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        aria-expanded={showAdvanced}
        className="mt-4 flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
      >
        <span aria-hidden="true">{showAdvanced ? "▾" : "▸"}</span>
        Advanced options
      </button>

      {showAdvanced && (
        <div className="tp-animate-in mt-3 grid grid-cols-1 gap-4 rounded-xl border border-border bg-surface-muted p-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label htmlFor="ai-endpoint" className="mb-1 block text-sm font-medium text-foreground">
              Endpoint override
            </label>
            <input
              id="ai-endpoint"
              value={endpointOverride}
              onChange={(e) => {
                setEndpointOverride(e.target.value);
                markDirty();
              }}
              placeholder={currentProviderInfo?.defaultEndpoint ?? ""}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary-400"
            />
            <p className="mt-1 text-xs text-foreground-muted">Must be https and cannot point at internal/private or cloud metadata addresses.</p>
          </div>
          <div>
            <label htmlFor="ai-temp" className="mb-1 block text-sm font-medium text-foreground">
              Temperature
            </label>
            <input
              id="ai-temp"
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => {
                setTemperature(e.target.value);
                markDirty();
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary-400"
            />
          </div>
          <div>
            <label htmlFor="ai-maxtok" className="mb-1 block text-sm font-medium text-foreground">
              Max output tokens
            </label>
            <input
              id="ai-maxtok"
              type="number"
              min={1}
              max={32000}
              value={maxOutputTokens}
              onChange={(e) => {
                setMaxOutputTokens(e.target.value);
                markDirty();
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary-400"
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-600 disabled:opacity-60">
          {saving ? "Saving…" : "Save configuration"}
        </button>
        <button type="button" onClick={test} disabled={testing} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary-300 disabled:opacity-60">
          {testing ? "Testing…" : "Test AI connection"}
        </button>
        {state.configured && (
          <button type="button" onClick={disconnect} className="rounded-lg border border-danger-500/40 px-4 py-2 text-sm font-medium text-danger-500 hover:bg-danger-100">
            Disconnect
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-foreground-muted">Testing sends one small, harmless inference request and may consume provider quota. Your search history is never sent.</p>

      {message && <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-sm text-foreground">{message}</p>}

      {result && (
        <div className="mt-4 rounded-xl border border-border bg-surface-muted p-4 text-sm">
          <p className="font-medium text-foreground">Last test — {new Date(result.testedAt).toLocaleString()}</p>
          <ul className="mt-2 space-y-1 text-foreground-muted">
            <li>Authentication: {result.authOk ? "✓ ok" : "✗ failed"}</li>
            <li>Inference: {result.inferenceOk ? "✓ ok" : "✗ failed"}</li>
            <li>Requested model: {result.requestedModel}{result.providerReportedModel ? ` (provider reported: ${result.providerReportedModel})` : ""}</li>
            <li>Response time: {result.responseTimeMs} ms</li>
            {result.sampleText && <li>Sample response: “{result.sampleText}”</li>}
            {result.errorMessage && <li className="text-danger-500">{result.errorCode}: {result.errorMessage}</li>}
          </ul>
        </div>
      )}
    </section>
  );
}
