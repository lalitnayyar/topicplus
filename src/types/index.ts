export interface RunSummary {
  id: string;
  searchId: string;
  parentRunId: string | null;
  status: string;
  isDemo: boolean;
  provider: string;
  effectiveQuery: string;
  filtersJson: { language?: string; startDate?: string; endDate?: string; includeReplies: boolean; includeReposts: boolean };
  requestedCount: number;
  retrievedCount: number;
  scoredCount: number;
  unscorableCount: number;
  dedupClusterCount: number;
  similarContentPct: number | null;
  similarityMethod: string | null;
  similarityThreshold: number | null;
  coverageStart: string | null;
  coverageEnd: string | null;
  startedAt: string;
  completedAt: string | null;
  cancelRequested: boolean;
  errorMessage: string | null;
  errorCode: string | null;
  averageTopicMatch: number | null;
  relevantPostsPct: number | null;
  aiProvider: string | null;
  aiModel: string | null;
  scoringRubricVersion: string;
  promptVersion: string;
}

export interface SearchSummary {
  id: string;
  topic: string;
  name: string | null;
  isFavorite: boolean;
}

export interface PostScore {
  score: number | null;
  explanation: string | null;
  isScorable: boolean;
  unscorableReason: string | null;
}

export interface CollectedPostView {
  id: string;
  postId: string;
  authorName: string;
  authorHandle: string;
  text: string;
  isTruncated: boolean;
  missingFields: string[] | null;
  language: string | null;
  url: string;
  postedAt: string;
  isRepost: boolean;
  isReply: boolean;
  engagementJson: { likes?: number; reposts?: number; replies?: number; views?: number } | null;
  engagementCollectedAt: string | null;
  duplicateClusterId: string | null;
  score: PostScore | null;
}

export interface DuplicateClusterView {
  id: string;
  representativeText: string;
  memberCount: number;
}

export interface ReportView {
  id: string;
  version: number;
  executiveSummary: string;
  themesJson: { name: string; postCount: number; postIds: string[] }[];
  keyTakeawaysJson: string[];
  disagreementsJson: { topic: string; viewpoints: { stance: string; postIds: string[] }[] }[];
  questionsJson: string[];
  representativePostsJson: { theme: string; postId: string }[];
  limitations: string;
  scoredPostCount: number;
  generatedByProvider: string;
  generatedByModel: string;
  createdAt: string;
}

export interface AuditEventView {
  id: string;
  searchId: string | null;
  runId: string | null;
  userId: string | null;
  actorType: string;
  action: string;
  outcome: string;
  metadataJson: Record<string, unknown> | null;
  createdAt: string;
}

export interface RunDetail {
  run: RunSummary;
  search: SearchSummary;
  posts: CollectedPostView[];
  duplicateClusters: DuplicateClusterView[];
  report: ReportView | null;
  progress: { postsSoFar: number; scoresSoFar: number };
}
