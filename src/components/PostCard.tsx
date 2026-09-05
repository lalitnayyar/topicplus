"use client";

import type { CollectedPostView } from "@/types";

function scoreColor(score: number | null): string {
  if (score === null) return "bg-surface-muted text-foreground-muted";
  if (score >= 90) return "bg-success-100 text-success-500";
  if (score >= 70) return "bg-primary-100 text-primary-700";
  if (score >= 40) return "bg-warning-100 text-warning-500";
  return "bg-danger-100 text-danger-500";
}

export function PostCard({ post, index }: { post: CollectedPostView; index?: number }) {
  const engagement = post.engagementJson;
  return (
    <article className="tp-animate-in rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          {index !== undefined && <span className="text-foreground-muted">#{index + 1}</span>}
          <span className="font-medium text-foreground">{post.authorName}</span>
          <span className="text-foreground-muted">@{post.authorHandle}</span>
          <span className="text-foreground-muted">· {new Date(post.postedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
        </div>
        {post.score && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreColor(post.score.score)}`}
            title={(post.score.isScorable ? post.score.explanation : post.score.unscorableReason) ?? undefined}
          >
            {post.score.isScorable ? `Topic Match ${post.score.score}` : "Unscorable"}
          </span>
        )}
      </div>

      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{post.text}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-foreground-muted">
        <a href={post.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-600 hover:underline">
          View source ↗
        </a>
        {post.isTruncated && <span className="rounded-full bg-warning-100 px-2 py-0.5 text-warning-500">Truncated</span>}
        {post.isRepost && <span className="rounded-full bg-surface-muted px-2 py-0.5">Repost</span>}
        {post.isReply && <span className="rounded-full bg-surface-muted px-2 py-0.5">Reply</span>}
        {post.duplicateClusterId && <span className="rounded-full bg-accent-50 px-2 py-0.5 text-accent-500">Near-duplicate</span>}
        {post.missingFields && post.missingFields.length > 0 && (
          <span className="rounded-full bg-surface-muted px-2 py-0.5">Missing: {post.missingFields.join(", ")}</span>
        )}
        {engagement && (
          <span>
            ♥ {engagement.likes ?? "n/a"} · ↻ {engagement.reposts ?? "n/a"} · ↩ {engagement.replies ?? "n/a"}
            {engagement.views !== undefined ? ` · ${engagement.views} views` : ""}
          </span>
        )}
      </div>
      {post.score?.isScorable && post.score.explanation && (
        <p className="mt-2 text-xs italic text-foreground-muted">{post.score.explanation}</p>
      )}
      {post.score && !post.score.isScorable && post.score.unscorableReason && (
        <p className="mt-2 text-xs italic text-danger-500">Unscorable: {post.score.unscorableReason}</p>
      )}
    </article>
  );
}
