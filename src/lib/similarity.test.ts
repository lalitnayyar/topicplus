import { describe, expect, it } from "vitest";
import { analyzeSimilarity, computeDuplicateClusters, jaccardSimilarity } from "./similarity";

describe("jaccardSimilarity", () => {
  it("scores identical text as fully similar", () => {
    expect(jaccardSimilarity("this is a test post about topics", "this is a test post about topics")).toBe(1);
  });

  it("scores unrelated text as dissimilar", () => {
    expect(jaccardSimilarity("cats are wonderful pets", "quarterly earnings exceeded expectations")).toBeLessThan(0.2);
  });
});

describe("computeDuplicateClusters / analyzeSimilarity", () => {
  it("groups near-duplicate posts and leaves distinct posts unclustered", () => {
    const posts = [
      { id: "1", text: "BREAKING: big news everyone should know about this right now" },
      { id: "2", text: "BREAKING: big news everyone should know about this right now!!" },
      { id: "3", text: "I have a completely different opinion about something else entirely" },
    ];
    const clusters = computeDuplicateClusters(posts, 0.6);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].memberIds.sort()).toEqual(["1", "2"]);
  });

  it("computes Similar Content % as share of posts in a cluster of size > 1", () => {
    const posts = [
      { id: "1", text: "same message repeated across accounts for visibility" },
      { id: "2", text: "same message repeated across accounts for visibility" },
      { id: "3", text: "an entirely unrelated independent thought on the matter" },
      { id: "4", text: "another entirely unrelated independent thought as well" },
    ];
    const result = analyzeSimilarity(posts);
    expect(result.clusterCount).toBe(1);
    expect(result.similarContentPct).toBe(50);
  });

  it("returns zero for an empty post set", () => {
    expect(analyzeSimilarity([])).toEqual({ clusters: [], similarContentPct: 0, clusterCount: 0 });
  });
});
