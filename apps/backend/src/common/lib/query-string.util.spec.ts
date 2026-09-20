import { sanitizeSearchQuery } from "./query-string.util";

describe("sanitizeSearchQuery", () => {
  it("returns undefined for undefined input", () => {
    expect(sanitizeSearchQuery(undefined)).toBeUndefined();
  });

  it("returns undefined for empty/whitespace-only input", () => {
    expect(sanitizeSearchQuery("")).toBeUndefined();
    expect(sanitizeSearchQuery("   ")).toBeUndefined();
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeSearchQuery("  tinta  ")).toBe("tinta");
  });

  it("passes short values through untouched", () => {
    expect(sanitizeSearchQuery("tinta preta")).toBe("tinta preta");
  });

  it("truncates values longer than the default max length (100)", () => {
    const long = "a".repeat(150);
    const result = sanitizeSearchQuery(long);
    expect(result).toHaveLength(100);
    expect(result).toBe("a".repeat(100));
  });

  it("respects a custom max length", () => {
    expect(sanitizeSearchQuery("abcdef", 3)).toBe("abc");
  });
});
