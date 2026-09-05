"use client";

const STYLES: Record<string, string> = {
  not_configured: "bg-surface-muted text-foreground-muted",
  saved: "bg-primary-100 text-primary-700",
  tested_ok: "bg-success-100 text-success-500",
  tested_failed: "bg-danger-100 text-danger-500",
};

const LABELS: Record<string, string> = {
  not_configured: "Not configured",
  saved: "Saved, not tested",
  tested_ok: "Tested — ready",
  tested_failed: "Tested — failed",
};

export function StatusBadge({ status, dirty }: { status: string; dirty?: boolean }) {
  if (dirty) {
    return <span className="rounded-full bg-warning-100 px-2.5 py-0.5 text-xs font-medium text-warning-500">Changed since last test</span>;
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status] ?? STYLES.not_configured}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
