import type {
  RawXPost,
  XConnectionTestResult,
  XProvider,
  XProviderCredentials,
  XSearchFilters,
  XSearchResult,
} from "./types";
import { buildEffectiveQuery } from "./demo";

// X API v2 recent-search adapter. Verify current capabilities/limits against
// https://docs.x.com/x-api before relying on this in production — access tiers and
// fields change independently of this codebase (Section 2).
const BASE_URL = "https://api.x.com/2";
const MAX_RESULTS_PER_PAGE = 100;

interface XApiUser {
  id: string;
  name: string;
  username: string;
}

interface XApiTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  lang?: string;
  public_metrics?: { like_count: number; retweet_count: number; reply_count: number; impression_count?: number };
  referenced_tweets?: { type: string; id: string }[];
}

function authHeaders(creds: XProviderCredentials): HeadersInit {
  if (!creds.bearerToken) throw new Error("Missing bearer token");
  return { Authorization: `Bearer ${creds.bearerToken}` };
}

function classifyHttpError(status: number): XConnectionTestResult["errorCode"] {
  if (status === 401) return "invalid_credentials";
  if (status === 403) return "insufficient_permissions";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "provider_outage";
  return "unknown";
}

export const XApiV2Provider: XProvider = {
  id: "x_api_v2",
  label: "X API v2 (recent search)",

  async testConnection(creds: XProviderCredentials): Promise<XConnectionTestResult> {
    const startedAt = Date.now();
    const testedAt = new Date().toISOString();
    try {
      const url = new URL(`${BASE_URL}/tweets/search/recent`);
      url.searchParams.set("query", "test -is:retweet");
      url.searchParams.set("max_results", "10");

      const res = await fetch(url, {
        headers: authHeaders(creds),
        signal: AbortSignal.timeout(10_000),
      });
      const responseTimeMs = Date.now() - startedAt;
      const remaining = res.headers.get("x-rate-limit-remaining");
      const limit = res.headers.get("x-rate-limit-limit");
      const reset = res.headers.get("x-rate-limit-reset");

      if (!res.ok) {
        return {
          authOk: res.status !== 401,
          searchOk: false,
          responseTimeMs,
          errorCode: classifyHttpError(res.status),
          errorMessage: sanitizeProviderError(res.status),
          testedAt,
          quota: remaining ? { remaining: Number(remaining), limit: limit ? Number(limit) : undefined } : undefined,
        };
      }

      return {
        authOk: true,
        searchOk: true,
        responseTimeMs,
        quota: remaining
          ? {
              remaining: Number(remaining),
              limit: limit ? Number(limit) : undefined,
              resetAt: reset ? new Date(Number(reset) * 1000).toISOString() : undefined,
            }
          : undefined,
        testedAt,
      };
    } catch (err) {
      return {
        authOk: false,
        searchOk: false,
        responseTimeMs: Date.now() - startedAt,
        errorCode: err instanceof Error && err.name === "TimeoutError" ? "timeout" : "unknown",
        errorMessage: "Could not reach the X API. Check network access and try again.",
        testedAt,
      };
    }
  },

  async search(
    creds: XProviderCredentials,
    topic: string,
    filters: XSearchFilters,
    targetCount: number,
    signal: AbortSignal
  ): Promise<XSearchResult> {
    const effectiveQuery = buildEffectiveQuery(topic, filters);
    const posts: RawXPost[] = [];
    const seenIds = new Set<string>();
    let nextToken: string | undefined;
    let status: XSearchResult["status"] = "completed";
    let errorMessage: string | undefined;
    let errorCode: string | undefined;

    try {
      while (posts.length < targetCount) {
        if (signal.aborted) {
          status = "canceled";
          break;
        }

        const url = new URL(`${BASE_URL}/tweets/search/recent`);
        url.searchParams.set("query", effectiveQuery);
        url.searchParams.set("max_results", String(Math.min(MAX_RESULTS_PER_PAGE, Math.max(10, targetCount - posts.length))));
        url.searchParams.set("tweet.fields", "created_at,lang,public_metrics,referenced_tweets,author_id");
        url.searchParams.set("expansions", "author_id");
        url.searchParams.set("user.fields", "name,username");
        if (filters.startDate) url.searchParams.set("start_time", new Date(filters.startDate).toISOString());
        if (filters.endDate) url.searchParams.set("end_time", new Date(filters.endDate).toISOString());
        if (nextToken) url.searchParams.set("next_token", nextToken);

        const res = await fetch(url, { headers: authHeaders(creds), signal });

        if (!res.ok) {
          status = posts.length > 0 ? "partial" : "failed";
          errorCode = classifyHttpError(res.status);
          errorMessage = sanitizeProviderError(res.status);
          break;
        }

        const json = (await res.json()) as {
          data?: XApiTweet[];
          includes?: { users?: XApiUser[] };
          meta?: { next_token?: string };
        };

        const users = new Map((json.includes?.users ?? []).map((u) => [u.id, u]));
        for (const tweet of json.data ?? []) {
          if (seenIds.has(tweet.id)) continue; // dedupe by post ID
          seenIds.add(tweet.id);
          const user = users.get(tweet.author_id);
          const isRepost = (tweet.referenced_tweets ?? []).some((r) => r.type === "retweeted");
          const isReply = (tweet.referenced_tweets ?? []).some((r) => r.type === "replied_to");
          posts.push({
            postId: tweet.id,
            authorName: user?.name ?? "Unknown author",
            authorHandle: user?.username ?? "unknown",
            text: tweet.text,
            isTruncated: false,
            missingFields: user ? [] : ["author"],
            language: tweet.lang,
            url: `https://x.com/${user?.username ?? "i"}/status/${tweet.id}`,
            postedAt: tweet.created_at,
            isRepost,
            isReply,
            engagement: tweet.public_metrics
              ? {
                  likes: tweet.public_metrics.like_count,
                  reposts: tweet.public_metrics.retweet_count,
                  replies: tweet.public_metrics.reply_count,
                  views: tweet.public_metrics.impression_count,
                }
              : undefined,
            engagementCollectedAt: new Date().toISOString(),
          });
          if (posts.length >= targetCount) break;
        }

        nextToken = json.meta?.next_token;
        if (!nextToken || (json.data ?? []).length === 0) break;
      }
    } catch {
      if (signal.aborted) {
        status = posts.length > 0 ? "partial" : "canceled";
      } else {
        status = posts.length > 0 ? "partial" : "failed";
        errorMessage = "Request to the X API failed or timed out.";
        errorCode = "unknown";
      }
    }

    if (posts.length < targetCount && status === "completed") {
      status = "partial";
    }

    const sorted = posts.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

    return {
      posts: sorted,
      effectiveQuery,
      status,
      requestedCount: targetCount,
      retrievedCount: sorted.length,
      coverageStart: sorted.length ? sorted[sorted.length - 1].postedAt : undefined,
      coverageEnd: sorted.length ? sorted[0].postedAt : undefined,
      errorMessage,
      errorCode,
    };
  },
};

function sanitizeProviderError(status: number): string {
  // Never echo raw provider response bodies (may contain request metadata); return a
  // short, actionable, sanitized message keyed off the HTTP status.
  switch (status) {
    case 401:
      return "Authentication failed — the bearer token is invalid or expired.";
    case 403:
      return "The credential is valid but lacks permission for this search (check your API access tier).";
    case 429:
      return "Rate limit or quota exceeded. Try again after the reset window.";
    default:
      return status >= 500
        ? "The X API reported a server error. Try again shortly."
        : `The X API rejected the request (HTTP ${status}).`;
  }
}
