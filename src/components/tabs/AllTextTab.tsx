"use client";

import { useMemo, useState } from "react";
import type { RunDetail } from "@/types";
import { LinkifiedText } from "@/components/LinkifiedText";

export function AllTextTab({ detail }: { detail: RunDetail }) {
  const { posts } = detail;
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const sorted = useMemo(
    () => [...posts].sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()),
    [posts]
  );
  const filtered = useMemo(() => {
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter((p) => p.text.toLowerCase().includes(q) || p.authorHandle.toLowerCase().includes(q));
  }, [sorted, query]);

  async function copyAll() {
    const text = filtered
      .map((p, i) => `${i + 1}. ${p.authorName} (@${p.authorHandle}) — ${new Date(p.postedAt).toLocaleString()} — ${p.url}\n${p.text}`)
      .join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-muted p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all extracted text"
          aria-label="Search all extracted text"
          className="min-w-[200px] flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus-visible:border-primary-400"
        />
        <button
          type="button"
          onClick={copyAll}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground-muted hover:border-primary-300 hover:text-primary-700"
        >
          {copied ? "Copied ✓" : "Copy all"}
        </button>
      </div>

      <ol className="space-y-4">
        {filtered.map((post, i) => (
          <li key={post.id} className="tp-animate-in rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-foreground-muted">
              <span className="font-semibold text-foreground">
                {i + 1}. {post.authorName} (@{post.authorHandle})
              </span>{" "}
              — {new Date(post.postedAt).toLocaleString()} —{" "}
              <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                source ↗
              </a>
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">
              <LinkifiedText text={post.text} />
            </p>
          </li>
        ))}
        {filtered.length === 0 && <p className="rounded-xl border border-border bg-surface p-6 text-sm text-foreground-muted">No posts match this search.</p>}
      </ol>
    </div>
  );
}
