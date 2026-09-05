"use client";

import { useMemo, useState } from "react";
import type { RunDetail } from "@/types";
import { PostCard } from "@/components/PostCard";

type SortMode = "newest" | "engagement";

export function PostsTab({ detail }: { detail: RunDetail }) {
  const { posts, run } = detail;
  const [query, setQuery] = useState("");
  const [minRelevance, setMinRelevance] = useState(0);
  const [sort, setSort] = useState<SortMode>("newest");
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    let list = posts.filter((p) => (p.score?.score ?? 0) >= minRelevance || (minRelevance === 0));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.text.toLowerCase().includes(q) || p.authorHandle.toLowerCase().includes(q));
    }
    if (sort === "engagement") {
      list = [...list].sort((a, b) => {
        const ea = a.engagementJson;
        const eb = b.engagementJson;
        const sa = (ea?.likes ?? 0) + (ea?.reposts ?? 0) + (ea?.replies ?? 0);
        const sb = (eb?.likes ?? 0) + (eb?.reposts ?? 0) + (eb?.replies ?? 0);
        return sb - sa;
      });
    }
    return list;
  }, [posts, query, minRelevance, sort]);

  async function copyAll() {
    const text = filtered.map((p) => `@${p.authorHandle} (${p.postedAt}): ${p.text}\n${p.url}`).join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface-muted p-3">
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="post-search" className="mb-1 block text-xs font-medium text-foreground-muted">
            Search within results
          </label>
          <input
            id="post-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search text or @handle"
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus-visible:border-primary-400"
          />
        </div>
        <div>
          <label htmlFor="min-relevance" className="mb-1 block text-xs font-medium text-foreground-muted">
            Min. relevance: {minRelevance}
          </label>
          <input
            id="min-relevance"
            type="range"
            min={0}
            max={100}
            step={10}
            value={minRelevance}
            onChange={(e) => setMinRelevance(Number(e.target.value))}
            className="w-36 accent-[var(--primary-500)]"
          />
        </div>
        <div>
          <label htmlFor="sort" className="mb-1 block text-xs font-medium text-foreground-muted">
            Sort
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus-visible:border-primary-400"
          >
            <option value="newest">Newest first</option>
            <option value="engagement">Engagement</option>
          </select>
        </div>
        <button
          type="button"
          onClick={copyAll}
          className="ml-auto rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground-muted hover:border-primary-300 hover:text-primary-700"
        >
          {copied ? "Copied ✓" : "Copy filtered"}
        </button>
      </div>

      <p className="mb-3 text-xs text-foreground-muted">
        Showing {filtered.length} of {posts.length} collected posts. Filtering does not change the {run.retrievedCount}-post collected set or the saved report — run again to regenerate with new filters.
      </p>

      <div className="space-y-3">
        {filtered.map((post, i) => (
          <PostCard key={post.id} post={post} index={i} />
        ))}
        {filtered.length === 0 && <p className="rounded-xl border border-border bg-surface p-6 text-sm text-foreground-muted">No posts match these filters.</p>}
      </div>
    </div>
  );
}
