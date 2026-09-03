import type { MemberPaymentFeeEntity } from "./member-payment-fee.entity";
import type { PaymentFeeEntity } from "./payment-fee.entity";
import type { PaymentMethod } from "./transaction.entity";

const FEE_ELIGIBLE_METHODS: ReadonlySet<PaymentMethod> = new Set([
  "credit_card",
  "debit_card",
]);

export interface FeeConfig {
  percent: string;
  fixedCents: number;
}

export interface FeeResult {
  feeCents: number;
  netCents: number;
}

export function computeNet(
  grossCents: number,
  method: PaymentMethod,
  fee?: FeeConfig | null,
): FeeResult {
  if (!fee || !FEE_ELIGIBLE_METHODS.has(method)) {
    return { feeCents: 0, netCents: grossCents };
  }

  const percent = Number.parseFloat(fee.percent) || 0;
  const rawFee = Math.round((grossCents * percent) / 100) + (fee.fixedCents || 0);
  const feeCents = Math.max(0, Math.min(rawFee, grossCents));

  return { feeCents, netCents: grossCents - feeCents };
}

export function isFeeEligible(method: PaymentMethod): boolean {
  return FEE_ELIGIBLE_METHODS.has(method);
}

export type FeeSource = "member" | "org" | "none";

export interface ResolvedFee {
  config: FeeConfig | null;
  source: FeeSource;
  configId: string | null;
}

export function resolveFee(
  method: PaymentMethod,
  memberFee: MemberPaymentFeeEntity | null,
  orgFee: PaymentFeeEntity | null,
): ResolvedFee {
  if (!isFeeEligible(method)) {
    return { config: null, source: "none", configId: null };
  }

  if (memberFee && memberFee.active) {
    return {
      config: { percent: memberFee.percent, fixedCents: memberFee.fixedCents },
      source: "member",
      configId: memberFee.id,
    };
  }

  if (orgFee) {
    return {
      config: { percent: orgFee.percent, fixedCents: orgFee.fixedCents },
      source: "org",
      configId: null,
    };
  }

  return { config: null, source: "none", configId: null };
}
