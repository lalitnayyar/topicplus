"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RunDetail } from "@/types";
import { ProgressStages } from "@/components/ProgressStages";
import { ResultsHeader } from "@/components/ResultsHeader";
import { ExportMenu } from "@/components/ExportMenu";
import { OverviewTab } from "@/components/tabs/OverviewTab";
import { ThemesTab } from "@/components/tabs/ThemesTab";
import { PostsTab } from "@/components/tabs/PostsTab";
import { AllTextTab } from "@/components/tabs/AllTextTab";
import { AuditLogTab } from "@/components/tabs/AuditLogTab";

const TABS = ["Overview", "Themes", "Posts", "All extracted text", "Audit log"] as const;
type Tab = (typeof TABS)[number];
const TERMINAL = ["completed", "partial", "failed", "canceled"];

export default function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("Overview");
  const [rerunLoading, setRerunLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchRun(): Promise<string | null> {
    const res = await fetch(`/api/runs/${id}`, { cache: "no-store" });
    if (res.status === 401) {
      router.push("/login");
      return null;
    }
    if (!res.ok) {
      setNotFound(true);
      return null;
    }
    const data: RunDetail = await res.json();
    setDetail(data);
    return data.run.status;
  }

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const status = await fetchRun();
      if (!cancelled && status && !TERMINAL.includes(status)) {
        timerRef.current = setTimeout(poll, 1500);
      }
    }
    poll();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onCancel() {
    await fetch(`/api/runs/${id}/cancel`, { method: "POST" });
    fetchRun();
  }

  async function onRerun() {
    if (!detail) return;
    setRerunLoading(true);
    const res = await fetch(`/api/searches/${detail.search.id}/rerun`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setRerunLoading(false);
    if (res.ok) {
      const body = await res.json();
      router.push(`/run/${body.runId}`);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-foreground-muted">This run could not be found, or you don&apos;t have access to it.</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="tp-shimmer h-40 rounded-2xl border border-border" />
      </div>
    );
  }

  const inProgress = !TERMINAL.includes(detail.run.status);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      {inProgress ? (
        <>
          <ResultsHeader detail={detail} onRerun={onRerun} onCancel={onCancel} rerunLoading={rerunLoading} />
          <ProgressStages
            status={detail.run.status}
            requestedCount={detail.run.requestedCount}
            postsSoFar={detail.progress.postsSoFar}
            scoresSoFar={detail.progress.scoresSoFar}
            isDemo={detail.run.isDemo}
          />
        </>
      ) : (
        <>
          <ResultsHeader detail={detail} onRerun={onRerun} onCancel={onCancel} rerunLoading={rerunLoading} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1" aria-label="Result views">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  aria-current={tab === t}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    tab === t ? "bg-primary-500 text-primary-foreground" : "text-foreground-muted hover:bg-surface-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </nav>
            <ExportMenu runId={id} />
          </div>

          <div>
            {tab === "Overview" && <OverviewTab detail={detail} />}
            {tab === "Themes" && <ThemesTab detail={detail} />}
            {tab === "Posts" && <PostsTab detail={detail} />}
            {tab === "All extracted text" && <AllTextTab detail={detail} />}
            {tab === "Audit log" && <AuditLogTab runId={id} />}
          </div>
        </>
      )}
    </div>
  );
}
