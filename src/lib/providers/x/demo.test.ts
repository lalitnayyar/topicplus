import { describe, expect, it } from "vitest";
import { DemoXProvider } from "./demo";

const baseFilters = { includeReplies: false, includeReposts: false };

describe("DemoXProvider.search", () => {
  it("never returns more posts than requested, and never more than 100", async () => {
    const result = await DemoXProvider.search({}, "topic", baseFilters, 25, new AbortController().signal);
    expect(result.retrievedCount).toBeLessThanOrEqual(25);
    expect(result.posts.length).toBe(result.retrievedCount);

    const capped = await DemoXProvider.search({}, "topic", baseFilters, 500, new AbortController().signal);
    expect(capped.retrievedCount).toBeLessThanOrEqual(100);
  });

  it("orders posts by posting time, newest first", async () => {
    const result = await DemoXProvider.search({}, "topic", baseFilters, 40, new AbortController().signal);
    const times = result.posts.map((p) => new Date(p.postedAt).getTime());
    for (let i = 1; i < times.length; i++) {
      expect(times[i - 1]).toBeGreaterThanOrEqual(times[i]);
    }
  });

  it("deduplicates by post ID", async () => {
    const result = await DemoXProvider.search({}, "topic", baseFilters, 60, new AbortController().signal);
    const ids = result.posts.map((p) => p.postId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("excludes reposts and replies by default", async () => {
    const result = await DemoXProvider.search({}, "topic", baseFilters, 80, new AbortController().signal);
    expect(result.posts.every((p) => !p.isRepost)).toBe(true);
    expect(result.posts.every((p) => !p.isReply)).toBe(true);
  });

  it("reports a completed status with a non-fabricated retrieved count", async () => {
    const result = await DemoXProvider.search({}, "topic", baseFilters, 30, new AbortController().signal);
    expect(result.status).toBe("completed");
    expect(result.retrievedCount).toBe(result.posts.length);
  });
});
