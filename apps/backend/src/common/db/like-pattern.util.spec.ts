import { containsPattern, escapeLikePattern } from "./like-pattern.util";

describe("escapeLikePattern", () => {
  it("escapes percent signs", () => {
    expect(escapeLikePattern("100%")).toBe("100\\%");
  });

  it("escapes underscores", () => {
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
  });

  it("escapes backslashes", () => {
    expect(escapeLikePattern("a\\b")).toBe("a\\\\b");
  });

  it("leaves terms without metacharacters untouched", () => {
    expect(escapeLikePattern("Tinta preta")).toBe("Tinta preta");
  });
});

describe("containsPattern", () => {
  it("wraps the escaped term in % wildcards", () => {
    expect(containsPattern("50%")).toBe("%50\\%%");
  });

  it("wraps a plain term in % wildcards", () => {
    expect(containsPattern("tinta")).toBe("%tinta%");
  });
});
