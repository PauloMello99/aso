import { computeCommission } from "./commission-calculator";

describe("computeCommission", () => {
  it("returns zero when config is null", () => {
    expect(computeCommission(10000, 9500, null)).toEqual({
      baseCents: 0,
      commissionCents: 0,
    });
  });

  it("returns zero when config is undefined", () => {
    expect(computeCommission(10000, 9500, undefined)).toEqual({
      baseCents: 0,
      commissionCents: 0,
    });
  });

  it("computes commission over gross value in gross mode", () => {
    const result = computeCommission(10000, 9500, {
      percent: "10",
      mode: "gross",
    });
    expect(result).toEqual({ baseCents: 10000, commissionCents: 1000 });
  });

  it("computes commission over net value in net mode", () => {
    const result = computeCommission(10000, 9500, {
      percent: "10",
      mode: "net",
    });
    expect(result).toEqual({ baseCents: 9500, commissionCents: 950 });
  });

  it("returns zero commission when percent is 0", () => {
    const result = computeCommission(10000, 9500, {
      percent: "0",
      mode: "gross",
    });
    expect(result).toEqual({ baseCents: 10000, commissionCents: 0 });
  });

  it("returns commission equal to base when percent is 100", () => {
    const result = computeCommission(10000, 9500, {
      percent: "100",
      mode: "gross",
    });
    expect(result).toEqual({ baseCents: 10000, commissionCents: 10000 });
  });

  it("rounds fractional commission values", () => {
    const result = computeCommission(3333, 3333, {
      percent: "33.33",
      mode: "gross",
    });
    // 3333 * 33.33 / 100 = 1110.9989 -> rounds to 1111
    expect(result).toEqual({ baseCents: 3333, commissionCents: 1111 });
  });

  it("clamps commission to never exceed the base", () => {
    const result = computeCommission(10000, 9500, {
      percent: "150",
      mode: "gross",
    });
    expect(result).toEqual({ baseCents: 10000, commissionCents: 10000 });
  });

  it("never returns a negative commission", () => {
    const result = computeCommission(10000, 9500, {
      percent: "-10",
      mode: "gross",
    });
    expect(result).toEqual({ baseCents: 10000, commissionCents: 0 });
  });
});
