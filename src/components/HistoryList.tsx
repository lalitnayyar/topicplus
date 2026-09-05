"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

interface HistoryItem {
  id: string;
  topic: string;
  name: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  latestRun: {
    id: string;
    status: string;
    retrievedCount: number;
    averageTopicMatch: number | null;
    relevantPostsPct: number | null;
    similarContentPct: number | null;
    startedAt: string;
    completedAt: string | null;
  } | null;
}

export function HistoryList() {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [q, setQ] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (favoriteOnly) params.set("favorite", "true");
    const res = await fetch(`/api/searches?${params.toString()}`);
    if (res.ok) {
      const body = await res.json();
      setItems(body.searches);
    }
  }, [q, favoriteOnly]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function toggleFavorite(item: HistoryItem) {
    setItems((prev) => prev && prev.map((i) => (i.id === item.id ? { ...i, isFavorite: !i.isFavorite } : i)));
    await fetch(`/api/searches/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !item.isFavorite }),
    });
  }

  async function saveRename(item: HistoryItem) {
    if (renameValue.trim()) {
      await fetch(`/api/searches/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
    }
    setRenamingId(null);
    load();
  }

  async function deleteItem(item: HistoryItem) {
    if (!confirm(`Delete "${item.name ?? item.topic}"? This removes it from your history.`)) return;
    await fetch(`/api/searches/${item.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-muted p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search history by topic"
          className="min-w-[200px] flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus-visible:border-primary-400"
        />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={favoriteOnly} onChange={(e) => setFavoriteOnly(e.target.checked)} className="h-4 w-4 accent-[var(--primary-500)]" />
          Favorites only
        </label>
      </div>

      {!items ? (
        <div className="tp-shimmer h-40 rounded-xl border border-border" />
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-sm text-foreground-muted">
          No saved searches yet. <Link href="/" className="text-primary-600 hover:underline">Start one</Link>.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="tp-animate-in rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {renamingId === item.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => saveRename(item)}
                      onKeyDown={(e) => e.key === "Enter" && saveRename(item)}
                      className="w-full max-w-sm rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus-visible:border-primary-400"
                    />
                  ) : (
                    <Link href={item.latestRun ? `/run/${item.latestRun.id}` : "#"} className="font-medium text-foreground hover:text-primary-700">
                      {item.name ?? item.topic}
                    </Link>
                  )}
                  <p className="mt-0.5 text-xs text-foreground-muted">
                    {item.latestRun ? (
                      <>
                        <span className="capitalize">{item.latestRun.status}</span> · {item.latestRun.retrievedCount} posts · Topic Match{" "}
                        {item.latestRun.averageTopicMatch ?? "n/a"}% · Similar Content {item.latestRun.similarContentPct ?? "n/a"}% ·{" "}
                        {new Date(item.latestRun.startedAt).toLocaleString()}
                      </>
                    ) : (
                      "No runs yet"
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleFavorite(item)}
                    aria-pressed={item.isFavorite}
                    title={item.isFavorite ? "Unfavorite" : "Favorite"}
                    className={`rounded-full border px-2 py-1 text-sm ${item.isFavorite ? "border-warning-500 text-warning-500" : "border-border text-foreground-muted"}`}
                  >
                    {item.isFavorite ? "★" : "☆"}
                  </button>
                  <Link href={`/search/${item.id}`} className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground-muted hover:border-primary-300 hover:text-primary-700">
                    Runs &amp; compare
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(item.id);
                      setRenameValue(item.name ?? item.topic);
                    }}
                    className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground-muted hover:border-primary-300 hover:text-primary-700"
                  >
                    Rename
                  </button>
                  {item.latestRun && (
                    <a
                      href={`/api/runs/${item.latestRun.id}/export?format=json`}
                      className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground-muted hover:border-primary-300 hover:text-primary-700"
                    >
                      Export
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteItem(item)}
                    className="rounded-full border border-danger-500/40 px-2.5 py-1 text-xs font-medium text-danger-500 hover:bg-danger-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
