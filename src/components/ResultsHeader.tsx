"use client";

import type { RunDetail } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-success-100 text-success-500",
  partial: "bg-warning-100 text-warning-500",
  failed: "bg-danger-100 text-danger-500",
  canceled: "bg-surface-muted text-foreground-muted",
};

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ResultsHeader({
  detail,
  onRerun,
  onCancel,
  rerunLoading,
}: {
  detail: RunDetail;
  onRerun: () => void;
  onCancel: () => void;
  rerunLoading: boolean;
}) {
  const { run, search } = detail;
  const terminal = ["completed", "partial", "failed", "canceled"].includes(run.status);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="tp-animate-in rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{search.topic}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded-full px-2.5 py-0.5 font-medium capitalize ${STATUS_STYLES[run.status] ?? "bg-primary-100 text-primary-700"}`}>
              {run.status}
            </span>
            {run.isDemo && (
              <span className="rounded-full bg-accent-50 px-2.5 py-0.5 font-medium text-accent-500">Demo mode</span>
            )}
            <span className="text-foreground-muted">Provider: {run.provider}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!terminal && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-danger-500/40 px-3 py-1.5 text-sm font-medium text-danger-500 hover:bg-danger-100"
            >
              Cancel
            </button>
          )}
          {terminal && (
            <button
              type="button"
              onClick={onRerun}
              disabled={rerunLoading}
              className="rounded-lg bg-primary-500 px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-600 disabled:opacity-60"
            >
              {rerunLoading ? "Starting…" : "Run again"}
            </button>
          )}
        </div>
      </div>

      {terminal && (
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Posts retrieved" value={`${run.retrievedCount} of ${run.requestedCount}`} />
          <Stat label="Average Topic Match" value={run.averageTopicMatch !== null ? `${run.averageTopicMatch}%` : "Not available"} sub="AI-estimated relevance" />
          <Stat
            label="Relevant Posts"
            value={run.relevantPostsPct !== null ? `${Math.round((run.relevantPostsPct / 100) * run.scoredCount)} of ${run.scoredCount} scored (${run.relevantPostsPct}%)` : "Not available"}
          />
          <Stat label="Similar Content" value={run.similarContentPct !== null ? `${run.similarContentPct}%` : "n/a"} sub={`${run.dedupClusterCount} cluster${run.dedupClusterCount === 1 ? "" : "s"}`} />
        </dl>
      )}

      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-2 text-sm text-foreground-muted sm:grid-cols-2">
        <p>
          <span className="font-medium text-foreground">Effective query:</span> {run.effectiveQuery}
        </p>
        <p>
          <span className="font-medium text-foreground">Retrieved:</span> {fmtDateTime(run.startedAt)} ({tz})
        </p>
        <p>
          <span className="font-medium text-foreground">Coverage window:</span> {fmtDateTime(run.coverageStart)} – {fmtDateTime(run.coverageEnd)}
        </p>
        <p>
          <span className="font-medium text-foreground">Filters:</span> {run.filtersJson.includeReposts ? "Reposts included" : "Reposts excluded"},{" "}
          {run.filtersJson.includeReplies ? "replies included" : "replies excluded"}
          {run.filtersJson.language ? `, lang:${run.filtersJson.language}` : ""}
        </p>
      </div>

      {run.errorMessage && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-500">
          {run.errorMessage}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-surface-muted p-3">
      <dt className="text-xs font-medium text-foreground-muted">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-foreground">{value}</dd>
      {sub && <p className="mt-0.5 text-xs text-foreground-muted">{sub}</p>}
    </div>
  );
}
