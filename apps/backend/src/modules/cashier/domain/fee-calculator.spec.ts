import { computeNet, resolveFee } from "./fee-calculator";
import type { FeeConfig } from "./fee-calculator";
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
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  });
}

describe("resolveFee", () => {
  it("prefers an active member fee over the org fee", () => {
    const result = resolveFee(
      "credit_card",
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
    const result = resolveFee("credit_card", null, buildOrgPaymentFee());
    expect(result).toEqual({
      config: { percent: "3.00", fixedCents: 10 },
      source: "org",
      configId: null,
    });
  });

  it("returns a none result when neither member nor org fee exists", () => {
    const result = resolveFee("credit_card", null, null);
    expect(result).toEqual({ config: null, source: "none", configId: null });
  });

  it("ignores fees for a non-eligible method even with a member fee configured", () => {
    const result = resolveFee(
      "cash",
      buildMemberPaymentFee({ paymentMethod: "cash" }),
      buildOrgPaymentFee({ paymentMethod: "cash" }),
    );
    expect(result).toEqual({ config: null, source: "none", configId: null });
  });

  it("treats a zeroed member fee as an explicit 0% decision and does not fall back to the org", () => {
    const result = resolveFee(
      "credit_card",
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
});

describe("computeNet", () => {
  it("charges no fee and keeps gross intact when the resolved config is null", () => {
    const { config } = resolveFee("credit_card", null, null);
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
});
