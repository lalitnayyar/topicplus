import { describe, expect, it } from "vitest";
import { assertSafeEndpoint } from "./ssrf";

describe("assertSafeEndpoint", () => {
  it("rejects non-https URLs", async () => {
    await expect(assertSafeEndpoint("http://api.example.com")).rejects.toThrow();
  });

  it("rejects loopback addresses", async () => {
    await expect(assertSafeEndpoint("https://127.0.0.1")).rejects.toThrow();
    await expect(assertSafeEndpoint("https://localhost")).rejects.toThrow();
  });

  it("rejects the cloud metadata address", async () => {
    await expect(assertSafeEndpoint("https://169.254.169.254/latest/meta-data")).rejects.toThrow();
  });

  it("rejects private network ranges", async () => {
    await expect(assertSafeEndpoint("https://10.0.0.5")).rejects.toThrow();
    await expect(assertSafeEndpoint("https://192.168.1.1")).rejects.toThrow();
    await expect(assertSafeEndpoint("https://172.16.0.1")).rejects.toThrow();
  });

  it("accepts a well-formed public https URL", async () => {
    await expect(assertSafeEndpoint("https://8.8.8.8")).resolves.toBeUndefined();
  });
});
