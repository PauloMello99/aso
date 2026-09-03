import { buildPaginated, parsePageParam, resolvePageRequest } from "./pagination";

const bounds = { defaultLimit: 50, maxLimit: 200 };

describe("resolvePageRequest", () => {
  it("uses defaults when req is undefined", () => {
    expect(resolvePageRequest(undefined, bounds)).toEqual({
      page: 1,
      limit: 50,
      offset: 0,
    });
  });

  it("uses defaults when page/limit are not provided", () => {
    expect(resolvePageRequest({}, bounds)).toEqual({
      page: 1,
      limit: 50,
      offset: 0,
    });
  });

  it("computes offset from page and limit", () => {
    expect(resolvePageRequest({ page: 3, limit: 20 }, bounds)).toEqual({
      page: 3,
      limit: 20,
      offset: 40,
    });
  });

  it("clamps limit above the max down to maxLimit", () => {
    expect(resolvePageRequest({ page: 1, limit: 500 }, bounds)).toEqual({
      page: 1,
      limit: 200,
      offset: 0,
    });
  });

  it("clamps limit below 1 up to 1", () => {
    expect(resolvePageRequest({ page: 1, limit: 0 }, bounds)).toEqual({
      page: 1,
      limit: 1,
      offset: 0,
    });
    expect(resolvePageRequest({ page: 1, limit: -10 }, bounds)).toEqual({
      page: 1,
      limit: 1,
      offset: 0,
    });
  });

  it("clamps page below 1 up to 1", () => {
    expect(resolvePageRequest({ page: 0 }, bounds)).toEqual({
      page: 1,
      limit: 50,
      offset: 0,
    });
    expect(resolvePageRequest({ page: -5 }, bounds)).toEqual({
      page: 1,
      limit: 50,
      offset: 0,
    });
  });

  it("falls back to defaults for non-finite page/limit instead of throwing", () => {
    expect(
      resolvePageRequest({ page: Number.NaN, limit: Number.POSITIVE_INFINITY }, bounds),
    ).toEqual({
      page: 1,
      limit: 50,
      offset: 0,
    });
  });

  it("respects custom bounds", () => {
    expect(
      resolvePageRequest({ page: 2, limit: 30 }, { defaultLimit: 10, maxLimit: 25 }),
    ).toEqual({
      page: 2,
      limit: 25,
      offset: 25,
    });
  });
});

describe("buildPaginated", () => {
  it("builds the envelope with computed total pages", () => {
    expect(buildPaginated(["a", "b"], 45, 1, 20)).toEqual({
      data: ["a", "b"],
      total: 45,
      page: 1,
      pages: 3,
    });
  });

  it("rounds up partial pages with Math.ceil", () => {
    expect(buildPaginated([], 41, 1, 20)).toEqual({
      data: [],
      total: 41,
      page: 1,
      pages: 3,
    });
  });

  it("returns pages 0 when total is 0", () => {
    expect(buildPaginated([], 0, 1, 20)).toEqual({
      data: [],
      total: 0,
      page: 1,
      pages: 0,
    });
  });

  it("returns exactly total/limit pages when it divides evenly", () => {
    expect(buildPaginated([], 40, 1, 20)).toEqual({
      data: [],
      total: 40,
      page: 1,
      pages: 2,
    });
  });
});

describe("parsePageParam", () => {
  it("returns undefined for undefined input", () => {
    expect(parsePageParam(undefined)).toBeUndefined();
  });

  it("returns undefined for empty or blank string", () => {
    expect(parsePageParam("")).toBeUndefined();
    expect(parsePageParam("   ")).toBeUndefined();
  });

  it("returns undefined for non-numeric input", () => {
    expect(parsePageParam("abc")).toBeUndefined();
  });

  it("returns undefined for non-integer input", () => {
    expect(parsePageParam("1.5")).toBeUndefined();
  });

  it("returns undefined for zero or negative values", () => {
    expect(parsePageParam("0")).toBeUndefined();
    expect(parsePageParam("-3")).toBeUndefined();
  });

  it("parses valid positive integers", () => {
    expect(parsePageParam("1")).toBe(1);
    expect(parsePageParam("42")).toBe(42);
  });
});
