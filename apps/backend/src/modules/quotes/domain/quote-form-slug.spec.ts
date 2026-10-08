import {
  hasValidQuoteFormSlugFormat,
  isReservedQuoteFormSlug,
  isValidQuoteFormSlug,
  normalizeQuoteFormSlug,
} from "./quote-form-slug";

describe("normalizeQuoteFormSlug", () => {
  it("trims and lowercases", () => {
    expect(normalizeQuoteFormSlug("  Maria-Tattoo ")).toBe("maria-tattoo");
  });
});

describe("isValidQuoteFormSlug", () => {
  it.each(["maria", "maria-tattoo", "abc", "a1b", "x".repeat(40), "tattoo-2026"])(
    "accepts %s",
    (slug) => {
      expect(isValidQuoteFormSlug(slug)).toBe(true);
    },
  );

  it.each([
    ["uppercase (without normalize)", "Maria"],
    ["double hyphen", "maria--tattoo"],
    ["leading hyphen", "-maria"],
    ["trailing hyphen", "maria-"],
    ["too short (1)", "a"],
    ["too short (2)", "ab"],
    ["too long (41)", "x".repeat(41)],
    ["underscore", "maria_tattoo"],
    ["space", "maria tattoo"],
    ["accent", "mária"],
    ["empty", ""],
  ])("rejects %s", (_label, slug) => {
    expect(isValidQuoteFormSlug(slug)).toBe(false);
  });

  it("accepts length 3 and 40, rejects length 2 and 41 explicitly", () => {
    expect(isValidQuoteFormSlug("abc")).toBe(true);
    expect(isValidQuoteFormSlug("ab")).toBe(false);
    expect(isValidQuoteFormSlug("x".repeat(40))).toBe(true);
    expect(isValidQuoteFormSlug("x".repeat(41))).toBe(false);
  });

  it("rejects reserved slugs", () => {
    expect(isValidQuoteFormSlug("admin")).toBe(false);
    expect(isValidQuoteFormSlug("orcamento")).toBe(false);
  });
});

describe("isReservedQuoteFormSlug", () => {
  it.each(["admin", "api", "suporte", "orcamentos", "assessorink", "ajuda"])(
    "flags %s as reserved",
    (slug) => {
      expect(isReservedQuoteFormSlug(slug)).toBe(true);
    },
  );

  it("does not flag a regular slug", () => {
    expect(isReservedQuoteFormSlug("maria")).toBe(false);
  });
});

describe("hasValidQuoteFormSlugFormat", () => {
  it("accepts a well-formed reserved slug (format only)", () => {
    expect(hasValidQuoteFormSlugFormat("admin")).toBe(true);
  });

  it("rejects malformed slug", () => {
    expect(hasValidQuoteFormSlugFormat("a--b")).toBe(false);
  });
});
