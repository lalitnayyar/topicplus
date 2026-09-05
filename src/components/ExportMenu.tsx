"use client";

const FORMATS = ["txt", "md", "csv", "json", "pdf"] as const;

export function ExportMenu({ runId, repCount }: { runId: string; repCount?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-foreground-muted">Export:</span>
      {FORMATS.map((f) => (
        <a
          key={f}
          href={`/api/runs/${runId}/export?format=${f}${f === "pdf" && repCount ? `&repCount=${repCount}` : ""}`}
          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium uppercase text-foreground-muted hover:border-primary-300 hover:text-primary-700"
        >
          {f}
        </a>
      ))}
    </div>
  );
}
