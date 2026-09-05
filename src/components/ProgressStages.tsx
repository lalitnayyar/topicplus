"use client";

import { useEffect, useState } from "react";

const STAGES = [
  { key: "pending", label: "Queued" },
  { key: "fetching", label: "Fetching posts" },
  { key: "extracting", label: "Extracting text" },
  { key: "scoring", label: "Scoring relevance" },
  { key: "grouping", label: "Grouping themes" },
  { key: "generating", label: "Generating report" },
  { key: "saving", label: "Saving results" },
] as const;

interface Props {
  status: string;
  requestedCount: number;
  postsSoFar: number;
  scoresSoFar: number;
  isDemo: boolean;
}

function messagesFor(status: string, requestedCount: number, postsSoFar: number, scoresSoFar: number, isDemo: boolean): string[] {
  switch (status) {
    case "pending":
      return ["Queuing your search…"];
    case "fetching":
      return [
        `Requesting up to ${requestedCount} recent posts${isDemo ? " (demo mode)" : ""}…`,
        "Paging through results, ordered by posting time…",
        "Deduplicating by post ID as pages arrive…",
      ];
    case "extracting":
      return [
        postsSoFar > 0 ? `Extracted text from ${postsSoFar} post${postsSoFar === 1 ? "" : "s"} so far…` : "Extracting available text and metadata…",
        "Marking truncated text and unavailable fields…",
      ];
    case "scoring":
      return [
        scoresSoFar > 0 ? `Scored ${scoresSoFar} post${scoresSoFar === 1 ? "" : "s"} for topic relevance…` : "Scoring topic relevance 0–100…",
        "Checking for near-duplicate content…",
      ];
    case "grouping":
      return ["Clustering related posts into themes…"];
    case "generating":
      return ["Drafting executive summary and takeaways…", "Validating every citation against collected posts…"];
    case "saving":
      return ["Saving this run to your history…"];
    default:
      return ["Working…"];
  }
}

export function ProgressStages({ status, requestedCount, postsSoFar, scoresSoFar, isDemo }: Props) {
  const currentIdx = STAGES.findIndex((s) => s.key === status);
  const messages = messagesFor(status, requestedCount, postsSoFar, scoresSoFar, isDemo);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    setMsgIdx(0);
    if (messages.length <= 1) return;
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % messages.length), 2200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, postsSoFar, scoresSoFar]);

  return (
    <div className="tp-animate-in rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <span className="tp-pulse relative inline-flex h-3 w-3 rounded-full bg-primary-500" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground" aria-live="polite">
          {messages[msgIdx]}
        </p>
      </div>

      <ol className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {STAGES.map((stage, i) => {
          const done = currentIdx > i;
          const active = currentIdx === i;
          return (
            <li
              key={stage.key}
              className={`rounded-xl border px-3 py-2.5 text-center text-xs font-medium transition-all duration-300 ${
                active
                  ? "border-primary-400 bg-primary-50 text-primary-700 scale-[1.03] shadow-sm"
                  : done
                    ? "border-primary-200 bg-primary-50/60 text-primary-600"
                    : "border-border text-foreground-muted"
              } ${active ? "tp-shimmer" : ""}`}
            >
              <span aria-hidden="true" className="mr-1">
                {done ? "✓" : active ? "●" : "○"}
              </span>
              {stage.label}
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs text-foreground-muted">
        Progress reflects real pipeline stages — no fabricated completion percentages.
      </p>
    </div>
  );
}
