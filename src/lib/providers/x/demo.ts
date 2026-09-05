import type {
  RawXPost,
  XConnectionTestResult,
  XProvider,
  XProviderCredentials,
  XSearchFilters,
  XSearchResult,
} from "./types";

// Synthetic sample data only. URLs use example.com (IANA-reserved for documentation)
// and handles are prefixed demo_ so nothing here can be mistaken for a real X post.
// Section 11: "Do not present sample data as live X content or use fabricated links
// that appear to be real posts."

const OPINION_TEMPLATES = [
  (t: string) => `Been trying ${t} all week and honestly the results surprised me. Sharing a quick thread on what worked.`,
  (t: string) => `Hot take: ${t} is overhyped right now. Curious if others are seeing the same thing.`,
  (t: string) => `Question for the timeline — has anyone compared ${t} against the older approach? Looking for real numbers, not vibes.`,
  (t: string) => `${t} just shipped a change that breaks my workflow. Anyone found a workaround yet?`,
  (t: string) => `Wrote up my notes on ${t} after using it in production for a month. Mixed feelings but leaning positive.`,
  (t: string) => `Unpopular opinion: most of the discourse around ${t} misses the actual use case people care about.`,
  (t: string) => `Just watched a talk on ${t}. The Q&A was more useful than the talk itself honestly.`,
  (t: string) => `${t} keeps coming up in every planning meeting this quarter. Feels like the whole industry pivoted overnight.`,
  (t: string) => `If you're evaluating ${t}, start with the docs before the marketing page. Docs told me more in 10 minutes.`,
  (t: string) => `Not sure ${t} is ready for regulated industries yet — compliance folks on here, thoughts?`,
];

const DUPLICATE_TEMPLATE = (t: string) =>
  `BREAKING: ${t} is trending right now — everyone should be paying attention to this. Link in bio.`;

// Appended to opinion-template posts so two posts sharing a template (topic is constant
// across a run, so the template alone would otherwise repeat verbatim) still read as
// distinct authors/viewpoints rather than accidental exact duplicates. The seeded
// DUPLICATE_TEMPLATE posts intentionally skip this so Similar Content % has something
// real to detect.
const VARIATIONS = [
  "Still forming an opinion though.",
  "Would love a second opinion from someone who's shipped this at scale.",
  "Not affiliated, just sharing what I've seen.",
  "Happy to be proven wrong here.",
  "Genuinely curious how this plays out over the next few months.",
  "Take this with a grain of salt, small sample size on my end.",
  "Bookmarking this thread for later.",
  "Following up after a few more days of testing.",
  "Team's split on this internally, for what it's worth.",
  "Might revisit this take in a month.",
  "Open to hearing the counterargument.",
  "This tracks with what a few colleagues mentioned too.",
  "Curious what the r/dataisbeautiful crowd would make of this.",
  "Adding this to my running notes doc.",
];

// A second, independent variation pool — combined with VARIATIONS this gives
// templates × VARIATIONS × DETAILS distinct combinations, so that even near 100
// posts, incidental exact-text collisions stay rare (the intentionally-seeded
// DUPLICATE_TEMPLATE posts remain the dominant source of real duplicates).
const DETAILS = [
  "Ran a small side-by-side comparison last night.",
  "Pulled this up after a client asked about it.",
  "Saw three different threads about this today alone.",
  "A former coworker flagged this to me this morning.",
  "This came up twice in stand-up already.",
  "Cross-posting from a Discord discussion.",
  "Noticed this trending in a niche subreddit too.",
  "Adding some context from a conference talk I caught.",
  "This lines up with a report I read last week.",
  "Grabbed this from a newsletter roundup.",
  "A friend on another team mentioned the same thing.",
  "Circling back after sitting on this for a few days.",
  "Someone in a Slack channel raised this exact point.",
  "This matches a pattern I've seen across a few projects.",
];

const AUTHORS = [
  ["Jordan Lee", "jordanbuilds"],
  ["Priya Nair", "priyacodes"],
  ["Marcus Webb", "marcuswebb"],
  ["Sofia Alvarez", "sofia_dev"],
  ["Tom Baker", "tombaker_"],
  ["Amara Chen", "amarachen"],
  ["Liam O'Connor", "liamoc"],
  ["Yuki Tanaka", "yukitanaka"],
  ["Fatima Khan", "fatimak"],
  ["Ben Carter", "bencarter"],
];

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

export const DemoXProvider: XProvider = {
  id: "demo",
  label: "Demo mode (synthetic sample posts)",

  async testConnection(): Promise<XConnectionTestResult> {
    return {
      authOk: true,
      searchOk: true,
      responseTimeMs: 40,
      testedAt: new Date().toISOString(),
    };
  },

  async search(
    _creds: XProviderCredentials,
    topic: string,
    filters: XSearchFilters,
    targetCount: number
  ): Promise<XSearchResult> {
    const rand = seededRandom(hashSeed(topic));
    const count = Math.min(targetCount, 100);
    const now = Date.now();
    const posts: RawXPost[] = [];

    for (let i = 0; i < count; i++) {
      const author = AUTHORS[i % AUTHORS.length];
      const isDuplicate = i % 11 === 0 && i > 0; // seed a handful of real near-duplicates
      const text = isDuplicate
        ? DUPLICATE_TEMPLATE(topic)
        : `${OPINION_TEMPLATES[i % OPINION_TEMPLATES.length](topic)} ${DETAILS[Math.floor(rand() * DETAILS.length)]} ${VARIATIONS[Math.floor(rand() * VARIATIONS.length)]}`;
      const minutesAgo = i * (7 + Math.floor(rand() * 5));
      const postedAt = new Date(now - minutesAgo * 60_000).toISOString();
      const isRepost = !filters.includeReposts ? false : rand() < 0.08;
      const isReply = rand() < 0.15;
      if (isRepost && !filters.includeReposts) continue;
      if (isReply && !filters.includeReplies) continue;

      posts.push({
        postId: `demo_${hashSeed(topic)}_${i}`,
        authorName: author[0],
        authorHandle: `demo_${author[1]}`,
        text,
        isTruncated: false,
        missingFields: rand() < 0.1 ? ["engagement.views"] : [],
        language: filters.language ?? "en",
        url: `https://example.com/demo/${author[1]}/status/${1000000 + i}`,
        postedAt,
        isRepost,
        isReply,
        engagement: {
          likes: Math.floor(rand() * 500),
          reposts: Math.floor(rand() * 120),
          replies: Math.floor(rand() * 60),
          views: rand() < 0.1 ? undefined : Math.floor(rand() * 20000),
        },
        engagementCollectedAt: new Date().toISOString(),
      });
    }

    const sorted = posts.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

    return {
      posts: sorted,
      effectiveQuery: buildEffectiveQuery(topic, filters),
      status: "completed",
      requestedCount: targetCount,
      retrievedCount: sorted.length,
      coverageStart: sorted.length ? sorted[sorted.length - 1].postedAt : undefined,
      coverageEnd: sorted.length ? sorted[0].postedAt : undefined,
    };
  },
};

export function buildEffectiveQuery(topic: string, filters: XSearchFilters): string {
  const parts = [topic.trim()];
  if (!filters.includeReposts) parts.push("-is:retweet");
  if (!filters.includeReplies) parts.push("-is:reply");
  if (filters.language) parts.push(`lang:${filters.language}`);
  return parts.join(" ");
}
