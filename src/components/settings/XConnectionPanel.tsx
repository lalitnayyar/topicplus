"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "./StatusBadge";

interface XTestResult {
  authOk: boolean;
  searchOk: boolean;
  responseTimeMs: number;
  quota?: { remaining?: number; limit?: number; resetAt?: string };
  errorCode?: string;
  errorMessage?: string;
  testedAt: string;
}

interface XState {
  provider: string;
  status: string;
  configured: boolean;
  savedAt: string | null;
  lastTestedAt: string | null;
  lastTestResult: XTestResult | null;
}

export function XConnectionPanel() {
  const [state, setState] = useState<XState | null>(null);
  const [bearerToken, setBearerToken] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/settings/x");
    if (res.ok) setState((await res.json()).connection);
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (bearerToken.length < 10) {
      setMessage("Enter a bearer token (at least 10 characters).");
      return;
    }
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings/x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "x_api_v2", bearerToken }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Connection saved.");
      setDirty(false);
      setBearerToken("");
      load();
    } else {
      const body = await res.json().catch(() => ({}));
      setMessage(body.error ?? "Could not save connection.");
    }
  }

  async function test() {
    setTesting(true);
    setMessage(null);
    const res = await fetch("/api/settings/x/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bearerToken ? { provider: "x_api_v2", bearerToken } : {}),
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

  async function disconnect() {
    if (!confirm("Disconnect the X connection? Saved history and reports are kept.")) return;
    await fetch("/api/settings/x", { method: "DELETE" });
    setBearerToken("");
    setDirty(false);
    load();
  }

  if (!state) return <div className="tp-shimmer h-48 rounded-2xl border border-border" />;

  const result = state.lastTestResult;

  return (
    <section className="tp-animate-in rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">X (Twitter) Connection</h2>
        <StatusBadge status={state.status} dirty={dirty} />
      </div>
      <p className="mt-1 text-sm text-foreground-muted">
        Provider: X API v2 (recent search). Uses a bearer token per the provider&apos;s documented auth flow — never your X password.
      </p>

      <div className="mt-4">
        <label htmlFor="bearer" className="mb-1 block text-sm font-medium text-foreground">
          Bearer token {state.configured && <span className="text-foreground-muted">(leave blank to keep the saved token)</span>}
        </label>
        <input
          id="bearer"
          type="password"
          autoComplete="off"
          value={bearerToken}
          onChange={(e) => {
            setBearerToken(e.target.value);
            setDirty(true);
          }}
          placeholder={state.configured ? "•••••••••••••• (saved)" : "Enter bearer token"}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary-400"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-600 disabled:opacity-60">
          {saving ? "Saving…" : "Save connection"}
        </button>
        <button type="button" onClick={test} disabled={testing} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary-300 disabled:opacity-60">
          {testing ? "Testing…" : "Test X connection"}
        </button>
        {state.configured && (
          <button type="button" onClick={disconnect} className="rounded-lg border border-danger-500/40 px-4 py-2 text-sm font-medium text-danger-500 hover:bg-danger-100">
            Disconnect
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-foreground-muted">Testing sends a minimal real search request and may consume provider quota.</p>

      {message && <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-sm text-foreground">{message}</p>}

      {result && (
        <div className="mt-4 rounded-xl border border-border bg-surface-muted p-4 text-sm">
          <p className="font-medium text-foreground">Last test — {new Date(result.testedAt).toLocaleString()}</p>
          <ul className="mt-2 space-y-1 text-foreground-muted">
            <li>Authentication: {result.authOk ? "✓ ok" : "✗ failed"}</li>
            <li>
              Search capability: {result.searchOk ? "✓ ok" : "✗ failed"}{" "}
              {result.authOk && !result.searchOk && "(auth succeeded but search access failed — this does not guarantee retrieval of 100 posts)"}
            </li>
            <li>Response time: {result.responseTimeMs} ms</li>
            {result.quota && <li>Quota remaining: {result.quota.remaining ?? "n/a"}{result.quota.limit ? ` / ${result.quota.limit}` : ""}</li>}
            {result.errorMessage && <li className="text-danger-500">{result.errorCode}: {result.errorMessage}</li>}
          </ul>
        </div>
      )}
    </section>
  );
}
