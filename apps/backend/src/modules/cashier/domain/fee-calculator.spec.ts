import {
  computeNet,
  feeTierFor,
  normalizeInstallments,
  resolveFee,
} from "./fee-calculator";
import type { FeeConfig } from "./fee-calculator";
import { InvalidFeePercentException } from "./exceptions/invalid-fee-percent.exception";
import { MemberPaymentFeeEntity } from "./member-payment-fee.entity";
import type { MemberPaymentFeeEntityProps } from "./member-payment-fee.entity";
import { PaymentFeeEntity } from "./payment-fee.entity";
import type { PaymentFeeEntityProps } from "./payment-fee.entity";

function buildMemberPaymentFee(
  overrides: Partial<MemberPaymentFeeEntityProps> = {},
): MemberPaymentFeeEntity {
  return MemberPaymentFeeEntity.create({
    id: "member-fee-1",
    orgId: "org-1",
    userId: "user-1",
    paymentMethod: "credit_card",
    percent: "5.00",
    fixedCents: 50,
    installments: 1,
    active: true,
    supersededAt: null,
    createdBy: "owner-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  });
}

function buildOrgPaymentFee(
  overrides: Partial<PaymentFeeEntityProps> = {},
): PaymentFeeEntity {
  return PaymentFeeEntity.create({
    id: "org-fee-1",
    orgId: "org-1",
    paymentMethod: "credit_card",
    percent: "3.00",
    fixedCents: 10,
    installments: 1,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  });
}

describe("resolveFee", () => {
  it("prefers an active member fee over the org fee", () => {
    const result = resolveFee(
      "credit_card",
      null,
      buildMemberPaymentFee(),
      buildOrgPaymentFee(),
    );
    expect(result).toEqual({
      config: { percent: "5.00", fixedCents: 50 },
      source: "member",
      configId: "member-fee-1",
    });
  });

  it("falls back to the org fee when there is no member fee", () => {
    const result = resolveFee("credit_card", null, null, buildOrgPaymentFee());
    expect(result).toEqual({
      config: { percent: "3.00", fixedCents: 10 },
      source: "org",
      configId: null,
    });
  });

  it("returns a none result when neither member nor org fee exists", () => {
    const result = resolveFee("credit_card", null, null, null);
    expect(result).toEqual({ config: null, source: "none", configId: null });
  });

  it("ignores fees for a non-eligible method even with a member fee configured", () => {
    const result = resolveFee(
      "cash",
      null,
      buildMemberPaymentFee({ paymentMethod: "cash" }),
      buildOrgPaymentFee({ paymentMethod: "cash" }),
    );
    expect(result).toEqual({ config: null, source: "none", configId: null });
  });

  it("treats a zeroed member fee as an explicit 0% decision and does not fall back to the org", () => {
    const result = resolveFee(
      "credit_card",
      null,
      buildMemberPaymentFee({ percent: "0.00", fixedCents: 0 }),
      buildOrgPaymentFee(),
    );
    expect(result).toEqual({
      config: { percent: "0.00", fixedCents: 0 },
      source: "member",
      configId: "member-fee-1",
    });
  });

  it("ignores an inactive member fee and falls back to the org fee", () => {
    const result = resolveFee(
      "credit_card",
      null,
      buildMemberPaymentFee({
        active: false,
        supersededAt: new Date("2026-02-01T00:00:00.000Z"),
      }),
      buildOrgPaymentFee(),
    );
    expect(result).toEqual({
      config: { percent: "3.00", fixedCents: 10 },
      source: "org",
      configId: null,
    });
  });

  it("uses the 6x config when the requested tier is 6", () => {
    const result = resolveFee(
      "credit_card",
      6,
      null,
      buildOrgPaymentFee({ installments: 6, percent: "7.00", fixedCents: 20 }),
    );
    expect(result).toEqual({
      config: { percent: "7.00", fixedCents: 20 },
      source: "org",
      configId: null,
    });
  });

  it("ignores a member config from a divergent tier but still uses a matching org config", () => {
    const result = resolveFee(
      "credit_card",
      6,
      buildMemberPaymentFee({ installments: 1 }),
      buildOrgPaymentFee({ installments: 6, percent: "7.00", fixedCents: 20 }),
    );
    expect(result).toEqual({
      config: { percent: "7.00", fixedCents: 20 },
      source: "org",
      configId: null,
    });
  });

  it("uses the member 6x config when the requested tier is 6", () => {
    const result = resolveFee(
      "credit_card",
      6,
      buildMemberPaymentFee({ installments: 6, percent: "9.00", fixedCents: 0 }),
      buildOrgPaymentFee({ installments: 6 }),
    );
    expect(result).toEqual({
      config: { percent: "9.00", fixedCents: 0 },
      source: "member",
      configId: "member-fee-1",
    });
  });

  it("returns none for a tier with no config, without falling back to the 1x tier", () => {
    const result = resolveFee(
      "credit_card",
      6,
      null,
      buildOrgPaymentFee({ installments: 1 }),
    );
    expect(result).toEqual({ config: null, source: "none", configId: null });
    expect(computeNet(10000, "credit_card", result.config)).toEqual({
      feeCents: 0,
      netCents: 10000,
    });
  });
});

describe("computeNet", () => {
  it("charges no fee and keeps gross intact when the resolved config is null", () => {
    const { config } = resolveFee("credit_card", null, null, null);
    expect(computeNet(10000, "credit_card", config)).toEqual({
      feeCents: 0,
      netCents: 10000,
    });
  });

  it("clamps the fee so the net value never goes negative", () => {
    const fee: FeeConfig = { percent: "0", fixedCents: 15000 };
    expect(computeNet(10000, "credit_card", fee)).toEqual({
      feeCents: 10000,
      netCents: 0,
    });
  });

  it("applies a fixed-only fee when percent is 0", () => {
    const fee: FeeConfig = { percent: "0", fixedCents: 50 };
    expect(computeNet(10000, "credit_card", fee)).toEqual({
      feeCents: 50,
      netCents: 9950,
    });
  });

  it("throws InvalidFeePercentException when the percent is malformed instead of treating it as 0%", () => {
    const fee: FeeConfig = { percent: "abc", fixedCents: 0 };
    expect(() => computeNet(10000, "credit_card", fee)).toThrow(
      InvalidFeePercentException,
    );
  });

  it("does not validate the percent for non-eligible methods", () => {
    const fee: FeeConfig = { percent: "abc", fixedCents: 0 };
    expect(computeNet(10000, "cash", fee)).toEqual({
      feeCents: 0,
      netCents: 10000,
    });
  });
});

describe("normalizeInstallments", () => {
  it("returns null for a method that does not support installments", () => {
    expect(normalizeInstallments("cash", 3)).toBeNull();
  });

  it("defaults to 1 when raw is undefined for credit_card", () => {
    expect(normalizeInstallments("credit_card", undefined)).toBe(1);
  });

  it("defaults to 1 when raw is null for credit_card", () => {
    expect(normalizeInstallments("credit_card", null)).toBe(1);
  });

  it("passes the raw value through without clamping out-of-range values", () => {
    expect(normalizeInstallments("credit_card", 99)).toBe(99);
  });
});

describe("feeTierFor", () => {
  it("is always 1 for a method other than credit_card", () => {
    expect(feeTierFor("debit_card", 6)).toBe(1);
  });

  it("uses the given installments for credit_card", () => {
    expect(feeTierFor("credit_card", 6)).toBe(6);
  });

  it("defaults to 1 for credit_card when installments is null", () => {
    expect(feeTierFor("credit_card", null)).toBe(1);
  });
});
