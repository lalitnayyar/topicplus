"use client";

import { useState } from "react";
import type { RunDetail } from "@/types";
import { PostCard } from "@/components/PostCard";

export function ThemesTab({ detail }: { detail: RunDetail }) {
  const { report, posts } = detail;
  const [openTheme, setOpenTheme] = useState<string | null>(null);
  const postById = new Map(posts.map((p) => [p.id, p]));

  if (!report || report.themesJson.length === 0) {
    return <p className="rounded-xl border border-border bg-surface p-6 text-sm text-foreground-muted">No themes were generated for this run.</p>;
  }

  // A post can appear in more than one theme if the grouping logic assigns it there.
  const membership = new Map<string, number>();
  for (const theme of report.themesJson) {
    for (const id of theme.postIds) membership.set(id, (membership.get(id) ?? 0) + 1);
  }
  const multiThemeCount = [...membership.values()].filter((c) => c > 1).length;

  return (
    <div className="space-y-3">
      {multiThemeCount > 0 && (
        <p className="text-xs text-foreground-muted">{multiThemeCount} post(s) belong to more than one theme below.</p>
      )}
      {report.themesJson.map((theme) => {
        const isOpen = openTheme === theme.name;
        return (
          <div key={theme.name} className="tp-animate-in overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <button
              type="button"
              onClick={() => setOpenTheme(isOpen ? null : theme.name)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-medium text-foreground">{theme.name}</span>
              <span className="flex items-center gap-2 text-sm text-foreground-muted">
                {theme.postCount} post{theme.postCount === 1 ? "" : "s"}
                <span aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
              </span>
            </button>
            {isOpen && (
              <div className="space-y-3 border-t border-border p-4">
                {theme.postIds.map((id) => {
                  const post = postById.get(id);
                  return post ? <PostCard key={id} post={post} /> : null;
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
