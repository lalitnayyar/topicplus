export interface XSearchFilters {
  language?: string;
  startDate?: string; // ISO date
  endDate?: string; // ISO date
  includeReplies: boolean;
  includeReposts: boolean; // default false — excluded by default per spec
}

export interface RawXPost {
  postId: string;
  authorName: string;
  authorHandle: string;
  text: string;
  isTruncated: boolean;
  missingFields: string[];
  language?: string;
  url: string;
  postedAt: string; // ISO
  isRepost: boolean;
  isReply: boolean;
  engagement?: {
    likes?: number;
    reposts?: number;
    replies?: number;
    views?: number;
  };
  engagementCollectedAt?: string;
}

export type RetrievalStatus = "completed" | "partial" | "failed" | "canceled";

export interface XSearchResult {
  posts: RawXPost[];
  effectiveQuery: string;
  status: RetrievalStatus;
  requestedCount: number;
  retrievedCount: number;
  coverageStart?: string;
  coverageEnd?: string;
  errorMessage?: string;
  errorCode?: string;
}

export interface XConnectionTestResult {
  authOk: boolean;
  searchOk: boolean;
  responseTimeMs: number;
  quota?: { remaining?: number; limit?: number; resetAt?: string };
  errorCode?: "invalid_credentials" | "insufficient_permissions" | "quota_exhausted" | "rate_limited" | "timeout" | "provider_outage" | "unknown";
  errorMessage?: string;
  testedAt: string;
}

export interface XProviderCredentials {
  bearerToken?: string;
}

export interface XProvider {
  id: string;
  label: string;
  testConnection(creds: XProviderCredentials): Promise<XConnectionTestResult>;
  search(
    creds: XProviderCredentials,
    topic: string,
    filters: XSearchFilters,
    targetCount: number,
    signal: AbortSignal
  ): Promise<XSearchResult>;
}
