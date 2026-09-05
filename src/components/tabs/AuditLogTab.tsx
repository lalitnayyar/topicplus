"use client";

import { useEffect, useState } from "react";
import type { AuditEventView } from "@/types";

export function AuditLogTab({ runId }: { runId: string }) {
  const [events, setEvents] = useState<AuditEventView[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/runs/${runId}/audit`)
      .then((r) => r.json())
      .then((d) => !cancelled && setEvents(d.events))
      .catch(() => !cancelled && setEvents([]));
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (!events) {
    return <div className="tp-shimmer h-40 rounded-xl border border-border" />;
  }

  if (events.length === 0) {
    return <p className="rounded-xl border border-border bg-surface p-6 text-sm text-foreground-muted">No audit events recorded yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <p className="border-b border-border bg-surface-muted px-4 py-2 text-xs text-foreground-muted">
        Times shown in your local time zone ({tz}). Events are append-only.
      </p>
      <ul className="divide-y divide-border">
        {events.map((e) => (
          <li key={e.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-3 text-sm">
            <span className="w-40 shrink-0 text-xs text-foreground-muted">{new Date(e.createdAt).toLocaleString()}</span>
            <span className="w-16 shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-center text-xs font-medium capitalize text-foreground-muted">
              {e.actorType}
            </span>
            <span className="font-medium text-foreground">{e.action.replace(/_/g, " ")}</span>
            <span className="text-xs text-foreground-muted">outcome: {e.outcome}</span>
            {e.metadataJson && Object.keys(e.metadataJson).length > 0 && (
              <span className="w-full text-xs text-foreground-muted sm:w-auto">{JSON.stringify(e.metadataJson)}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
