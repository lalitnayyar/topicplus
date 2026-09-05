import { describe, expect, it } from "vitest";
import { generateReport } from "./report";

describe("generateReport (heuristic path, no AI configured)", () => {
  it("only cites post ids that were actually collected", async () => {
    const posts = [
      { id: "a1", text: "topicpulse launched a new feature today for developers", authorHandle: "dev1", url: "https://example.com/1", score: 90 },
      { id: "a2", text: "topicpulse launched a new feature today for developers", authorHandle: "dev2", url: "https://example.com/2", score: 85 },
      { id: "a3", text: "totally unrelated content about weekend plans", authorHandle: "dev3", url: "https://example.com/3", score: 20 },
    ];
    const validIds = new Set(posts.map((p) => p.id));
    const report = await generateReport("topicpulse", posts, null);

    for (const theme of report.themes) {
      for (const id of theme.postIds) expect(validIds.has(id)).toBe(true);
    }
    for (const rp of report.representativePosts) {
      expect(validIds.has(rp.postId)).toBe(true);
    }
  });

  it("handles zero collected posts without fabricating a report", async () => {
    const report = await generateReport("topic", [], null);
    expect(report.themes).toHaveLength(0);
    expect(report.representativePosts).toHaveLength(0);
    expect(report.executiveSummary).toMatch(/no posts were collected/i);
  });
});
