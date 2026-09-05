import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("prefixes formula-injection payloads with a single quote", () => {
    const csv = toCsv(["a"], [["=SUM(A1:A9)"], ["+1+1"], ["-1"], ["@cmd"], ["\ttabbed"]]);
    const lines = csv.split("\r\n").slice(1);
    expect(lines[0]).toBe("'=SUM(A1:A9)");
    expect(lines[1]).toBe("'+1+1");
    expect(lines[2]).toBe("'-1");
    expect(lines[3]).toBe("'@cmd");
    expect(lines[4]).toBe("'\ttabbed");
  });

  it("leaves ordinary text untouched", () => {
    const csv = toCsv(["a"], [["hello world"]]);
    expect(csv).toBe("a\r\nhello world");
  });

  it("quotes and escapes fields containing commas, quotes, or newlines", () => {
    const csv = toCsv(["a"], [['he said "hi", then left\nnext line']]);
    expect(csv).toBe('a\r\n"he said ""hi"", then left\nnext line"');
  });
});
