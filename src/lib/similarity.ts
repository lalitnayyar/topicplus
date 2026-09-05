// Near-duplicate detection used for both "duplicate handling" (Section 2) and the
// Similar Content % authenticity-adjacent signal (Section 2 addendum). Method: normalized
// word-shingle Jaccard similarity. Documented threshold below is surfaced in the UI so the
// metric is never presented as an opaque black box.
export const SIMILARITY_METHOD = "normalized-text jaccard (3-word shingles)";
export const SIMILARITY_THRESHOLD = 0.6;

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[@#]\w+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shingles(text: string, size = 3): Set<string> {
  const tokens = normalizeText(text).split(" ").filter(Boolean);
  if (tokens.length < size) return new Set(tokens.length ? [tokens.join(" ")] : []);
  const result = new Set<string>();
  for (let i = 0; i <= tokens.length - size; i++) {
    result.add(tokens.slice(i, i + size).join(" "));
  }
  return result;
}

export function jaccardSimilarity(a: string, b: string): number {
  const sa = shingles(a);
  const sb = shingles(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let intersection = 0;
  for (const s of sa) if (sb.has(s)) intersection++;
  const union = sa.size + sb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface ClusterInput {
  id: string;
  text: string;
}

export interface DuplicateCluster {
  memberIds: string[];
  representativeText: string;
}

// Union-find clustering over pairwise similarity >= threshold. O(n^2) comparisons,
// fine for the <=100-post scale this app operates at.
export function computeDuplicateClusters(
  posts: ClusterInput[],
  threshold: number = SIMILARITY_THRESHOLD
): DuplicateCluster[] {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) && parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const p of posts) parent.set(p.id, p.id);

  for (let i = 0; i < posts.length; i++) {
    for (let j = i + 1; j < posts.length; j++) {
      if (jaccardSimilarity(posts[i].text, posts[j].text) >= threshold) {
        union(posts[i].id, posts[j].id);
      }
    }
  }

  const groups = new Map<string, string[]>();
  for (const p of posts) {
    const root = find(p.id);
    const arr = groups.get(root) ?? [];
    arr.push(p.id);
    groups.set(root, arr);
  }

  const byId = new Map(posts.map((p) => [p.id, p.text]));
  const clusters: DuplicateCluster[] = [];
  for (const memberIds of groups.values()) {
    if (memberIds.length > 1) {
      clusters.push({ memberIds, representativeText: byId.get(memberIds[0]) ?? "" });
    }
  }
  return clusters;
}

export interface SimilarityResult {
  clusters: DuplicateCluster[];
  similarContentPct: number;
  clusterCount: number;
}

export function analyzeSimilarity(posts: ClusterInput[]): SimilarityResult {
  if (posts.length === 0) {
    return { clusters: [], similarContentPct: 0, clusterCount: 0 };
  }
  const clusters = computeDuplicateClusters(posts);
  const clusteredCount = clusters.reduce((sum, c) => sum + c.memberIds.length, 0);
  return {
    clusters,
    similarContentPct: Math.round((clusteredCount / posts.length) * 1000) / 10,
    clusterCount: clusters.length,
  };
}
