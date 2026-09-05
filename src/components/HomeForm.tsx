"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const EXAMPLES = ["AI coding agents", "#ClimateWeek", "electric vehicle batteries", "premier league transfers"];

export function HomeForm() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [language, setLanguage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeReplies, setIncludeReplies] = useState(false);
  const [includeReposts, setIncludeReposts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (topic.trim().length < 2) {
      setError("Enter a topic, phrase, hashtag, or search query (at least 2 characters).");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: topic.trim(),
        filters: {
          language: language || undefined,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
          includeReplies,
          includeReposts,
        },
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not start the search");
      return;
    }
    const body = await res.json();
    router.push(`/run/${body.runId}`);
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="topic" className="block text-sm font-medium text-foreground">
        Topic, phrase, hashtag, or search query
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. AI coding agents"
          className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus-visible:border-primary-400"
          maxLength={280}
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-xl bg-primary-500 px-6 py-3 font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-600 disabled:opacity-60"
        >
          {loading ? "Starting…" : "Analyze latest posts"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setTopic(ex)}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-muted hover:border-primary-300 hover:text-primary-700"
          >
            {ex}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-500">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowFilters((v) => !v)}
        aria-expanded={showFilters}
        className="mt-5 flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
      >
        <span aria-hidden="true">{showFilters ? "▾" : "▸"}</span>
        Search filters
      </button>

      {showFilters && (
        <div className="tp-animate-in mt-3 grid grid-cols-1 gap-4 rounded-xl border border-border bg-surface-muted p-4 sm:grid-cols-2">
          <div>
            <label htmlFor="language" className="mb-1 block text-sm font-medium text-foreground">
              Language
            </label>
            <input
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="en, es, ja…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary-400"
            />
          </div>
          <div className="flex items-end gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={includeReplies} onChange={(e) => setIncludeReplies(e.target.checked)} className="h-4 w-4 accent-[var(--primary-500)]" />
              Include replies
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={includeReposts} onChange={(e) => setIncludeReposts(e.target.checked)} className="h-4 w-4 accent-[var(--primary-500)]" />
              Include reposts
            </label>
          </div>
          <div>
            <label htmlFor="startDate" className="mb-1 block text-sm font-medium text-foreground">
              From date
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary-400"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="mb-1 block text-sm font-medium text-foreground">
              To date
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary-400"
            />
          </div>
          <p className="sm:col-span-2 text-xs text-foreground-muted">
            Reposts are excluded by default. Replies are excluded by default.
          </p>
        </div>
      )}
    </form>
  );
}
