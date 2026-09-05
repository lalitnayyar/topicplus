import { describe, expect, it } from "vitest";
import { renderReportPdf } from "./pdf";

const baseInput = {
  topic: "AI coding agents",
  status: "completed",
  provider: "demo",
  isDemo: true,
  retrievedCount: 2,
  requestedCount: 2,
  scoredCount: 2,
  unscorableCount: 0,
  coverageStart: "2026-01-01T00:00:00.000Z",
  coverageEnd: "2026-01-02T00:00:00.000Z",
  averageTopicMatch: 80,
  relevantPostsPct: 100,
  similarContentPct: 0,
  dedupClusterCount: 0,
};

describe("renderReportPdf", () => {
  it("produces a well-formed PDF buffer with a report and representative posts", async () => {
    const buffer = await renderReportPdf({
      ...baseInput,
      report: {
        executiveSummary: "A concise summary of the discussion.",
        keyTakeawaysJson: ["Takeaway one", "Takeaway two"],
        questionsJson: ["What happens next?"],
        limitations: "Some limitation text.",
        generatedByProvider: "openai",
        generatedByModel: "gpt-4o-mini",
      },
      representativePosts: [
        { theme: "Adoption", authorName: "Jordan Lee", authorHandle: "jordan", postedAt: "2026-01-01T12:00:00.000Z", url: "https://example.com/1", text: "A representative post.", score: 92 },
      ],
    });

    expect(buffer.subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(500);
  });

  it("handles a null report and empty representative posts without crashing", async () => {
    const buffer = await renderReportPdf({ ...baseInput, report: null, representativePosts: [] });
    expect(buffer.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});
