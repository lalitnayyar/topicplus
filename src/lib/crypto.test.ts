import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "unit-test-only-encryption-key";
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a secret", async () => {
    const { encryptSecret, decryptSecret } = await import("./crypto");
    const plaintext = "sk-super-secret-token-12345";
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV) but decrypts the same", async () => {
    const { encryptSecret, decryptSecret } = await import("./crypto");
    const a = encryptSecret("same-value");
    const b = encryptSecret("same-value");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same-value");
    expect(decryptSecret(b)).toBe("same-value");
  });

  it("rejects a tampered payload", async () => {
    const { encryptSecret, decryptSecret } = await import("./crypto");
    const encrypted = encryptSecret("value");
    const [iv, tag, data] = encrypted.split(".");
    const tampered = [iv, tag, data.slice(0, -2) + "AA"].join(".");
    expect(() => decryptSecret(tampered)).toThrow();
  });
});

describe("maskSecret", () => {
  it("keeps only the last 4 characters visible", async () => {
    const { maskSecret } = await import("./crypto");
    expect(maskSecret("sk-abcdef1234")).toBe("••••1234");
  });

  it("fully masks very short secrets", async () => {
    const { maskSecret } = await import("./crypto");
    expect(maskSecret("abc")).toBe("••••");
  });
});
