import { describe, expect, it } from "vitest";
import { splitTextAndUrls } from "./linkify";

describe("splitTextAndUrls", () => {
  it("leaves plain text with no URLs as a single non-url segment", () => {
    const segments = splitTextAndUrls("just some plain text");
    expect(segments).toEqual([{ text: "just some plain text", isUrl: false }]);
  });

  it("identifies an embedded http(s) URL as its own segment", () => {
    const segments = splitTextAndUrls("check this out https://example.com/status/1 amazing");
    expect(segments).toEqual([
      { text: "check this out ", isUrl: false },
      { text: "https://example.com/status/1", isUrl: true },
      { text: " amazing", isUrl: false },
    ]);
  });

  it("handles multiple URLs in the same text", () => {
    const segments = splitTextAndUrls("see https://a.example.com and https://b.example.com too");
    const urls = segments.filter((s) => s.isUrl).map((s) => s.text);
    expect(urls).toEqual(["https://a.example.com", "https://b.example.com"]);
  });

  it("never treats a javascript: or data: scheme as a URL segment", () => {
    const segments = splitTextAndUrls("click javascript:alert(1) or data:text/html,x");
    expect(segments.every((s) => !s.isUrl)).toBe(true);
  });

  it("excludes trailing punctuation-adjacent characters like a closing paren", () => {
    const segments = splitTextAndUrls("(see https://example.com/page) for details");
    const url = segments.find((s) => s.isUrl);
    expect(url?.text).toBe("https://example.com/page");
  });
});
