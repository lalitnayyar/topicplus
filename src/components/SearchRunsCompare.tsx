"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RunSummary, SearchSummary } from "@/types";

export function SearchRunsCompare({ searchId }: { searchId: string }) {
  const [search, setSearch] = useState<SearchSummary | null>(null);
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/searches/${searchId}`)
      .then((r) => r.json())
      .then((d) => {
        setSearch(d.search);
        setRuns(d.runs);
      });
  }, [searchId]);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  const compareRuns = runs?.filter((r) => selected.includes(r.id)) ?? [];

  return (
    <div>
      <Link href="/history" className="text-sm text-primary-600 hover:underline">
        ← Back to History
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">{search?.name ?? search?.topic ?? "…"}</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        All runs for this search. Select up to two to compare collection windows, counts, topic match, and themes.
      </p>

      {!runs ? (
        <div className="tp-shimmer mt-6 h-40 rounded-xl border border-border" />
      ) : (
        <ul className="mt-6 space-y-2">
          {runs.map((r) => (
            <li key={r.id} className="tp-animate-in flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <input
                type="checkbox"
                checked={selected.includes(r.id)}
                onChange={() => toggle(r.id)}
                aria-label={`Select run from ${new Date(r.startedAt).toLocaleString()}`}
                className="h-4 w-4 accent-[var(--primary-500)]"
              />
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium capitalize text-foreground-muted">{r.status}</span>
              <span className="text-sm text-foreground">{new Date(r.startedAt).toLocaleString()}</span>
              <span className="text-xs text-foreground-muted">
                {r.retrievedCount} posts · Match {r.averageTopicMatch ?? "n/a"}% · Similar {r.similarContentPct ?? "n/a"}%
              </span>
              <Link href={`/run/${r.id}`} className="ml-auto text-sm font-medium text-primary-600 hover:underline">
                Open →
              </Link>
            </li>
          ))}
        </ul>
      )}

      {compareRuns.length === 2 && (
        <div className="tp-animate-in mt-8 overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
                <th className="px-4 py-2 font-medium">Metric</th>
                {compareRuns.map((r) => (
                  <th key={r.id} className="px-4 py-2 font-medium">
                    {new Date(r.startedAt).toLocaleDateString()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <Row label="Status" runs={compareRuns} get={(r) => r.status} />
              <Row label="Coverage window" runs={compareRuns} get={(r) => `${r.coverageStart ?? "n/a"} → ${r.coverageEnd ?? "n/a"}`} />
              <Row label="Posts retrieved" runs={compareRuns} get={(r) => `${r.retrievedCount} of ${r.requestedCount}`} />
              <Row label="Average Topic Match" runs={compareRuns} get={(r) => (r.averageTopicMatch !== null ? `${r.averageTopicMatch}%` : "n/a")} />
              <Row label="Relevant Posts %" runs={compareRuns} get={(r) => (r.relevantPostsPct !== null ? `${r.relevantPostsPct}%` : "n/a")} />
              <Row label="Similar Content %" runs={compareRuns} get={(r) => (r.similarContentPct !== null ? `${r.similarContentPct}%` : "n/a")} />
              <Row label="Scoring rubric / prompt version" runs={compareRuns} get={(r) => `${r.scoringRubricVersion} / ${r.promptVersion}`} />
              <Row label="AI provider / model" runs={compareRuns} get={(r) => (r.aiProvider ? `${r.aiProvider} / ${r.aiModel}` : "heuristic (no AI)")} />
            </tbody>
          </table>
          <p className="border-t border-border px-4 py-3 text-xs text-foreground-muted">
            Differences in retrieval coverage or scoring/prompt versions between runs may affect how directly these numbers compare.
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, runs, get }: { label: string; runs: RunSummary[]; get: (r: RunSummary) => string }) {
  return (
    <tr>
      <td className="px-4 py-2 font-medium text-foreground-muted">{label}</td>
      {runs.map((r) => (
        <td key={r.id} className="px-4 py-2 text-foreground capitalize">
          {get(r)}
        </td>
      ))}
    </tr>
  );
}
