import { describe, expect, it, vi } from "vitest";
import { scoreRelevance } from "./scoring";
import { AIProviderError, type AIProvider } from "@/lib/providers/ai/types";

describe("scoreRelevance (heuristic path, no AI configured)", () => {
  it("scores every post as scorable and computes both aggregate metrics", async () => {
    const outcome = await scoreRelevance(
      "AI coding agents",
      [
        { id: "p1", text: "AI coding agents are changing how I write software every day" },
        { id: "p2", text: "I only eat pizza on Fridays, nothing to do with software" },
      ],
      null
    );
    expect(outcome.source).toBe("heuristic");
    expect(outcome.scores).toHaveLength(2);
    expect(outcome.scoredCount).toBe(2);
    expect(outcome.unscorableCount).toBe(0);
    expect(outcome.averageTopicMatch).not.toBeNull();
    expect(outcome.relevantPostsPct).not.toBeNull();

    const p1 = outcome.scores.find((s) => s.postId === "p1")!;
    const p2 = outcome.scores.find((s) => s.postId === "p2")!;
    expect(p1.score!).toBeGreaterThan(p2.score!);
  });

  it("Relevant Posts % counts only scores >= 70", async () => {
    const outcome = await scoreRelevance(
      "quantum computing breakthroughs",
      [
        { id: "p1", text: "quantum computing breakthroughs announced by researchers today" },
        { id: "p2", text: "completely unrelated text about gardening tips for spring" },
      ],
      null
    );
    const relevantCount = outcome.scores.filter((s) => (s.score ?? 0) >= 70).length;
    expect(outcome.relevantPostsPct).toBe(Math.round((relevantCount / outcome.scoredCount) * 100));
  });

  it("returns Not-available aggregates (null) when there are zero posts to score", async () => {
    const outcome = await scoreRelevance("topic", [], null);
    expect(outcome.scoredCount).toBe(0);
    expect(outcome.unscorableCount).toBe(0);
    expect(outcome.averageTopicMatch).toBeNull();
    expect(outcome.relevantPostsPct).toBeNull();
  });
});

describe("scoreRelevance (AI configured but the call fails)", () => {
  // Regression test: a provider failure (auth/rate-limit/network) must be surfaced with
  // its specific reason, not collapsed into a generic "could not be parsed" message that
  // hides what actually went wrong.
  it("marks posts unscorable with the specific provider error, not a generic message", async () => {
    const failingProvider: AIProvider = {
      id: "ollama_cloud",
      label: "Ollama Cloud",
      defaultEndpoint: "https://ollama.com",
      supportsModelDiscovery: true,
      fallbackModels: [],
      listModels: vi.fn(),
      complete: vi.fn().mockRejectedValue(new AIProviderError("rate_limited", "Rate limit exceeded. Try again shortly.")),
      testConnection: vi.fn(),
    };
    const outcome = await scoreRelevance(
      "topic",
      [{ id: "p1", text: "some post about the topic" }],
      { provider: failingProvider, config: { apiKey: "key", model: "llama3.3:70b" } }
    );

    expect(outcome.scoredCount).toBe(0);
    expect(outcome.unscorableCount).toBe(1);
    expect(outcome.scores[0].unscorableReason).toContain("rate_limited");
    expect(outcome.scores[0].unscorableReason).toContain("Rate limit exceeded");
  });
});
