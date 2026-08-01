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
