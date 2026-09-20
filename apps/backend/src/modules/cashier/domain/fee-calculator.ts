import type { MemberPaymentFeeEntity } from "./member-payment-fee.entity";
import type { PaymentFeeEntity } from "./payment-fee.entity";
import type { PaymentMethod } from "./transaction.entity";
import { InvalidFeePercentException } from "./exceptions/invalid-fee-percent.exception";

const FEE_ELIGIBLE_METHODS: ReadonlySet<PaymentMethod> = new Set([
  "credit_card",
  "debit_card",
]);

/** Teto OFERECIDO na UI para número de parcelas (CHECK do banco permite até 24). */
export const MAX_INSTALLMENTS = 12;

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

  const percent = Number.parseFloat(fee.percent);
  if (Number.isNaN(percent)) {
    throw new InvalidFeePercentException(fee.percent);
  }
  const rawFee = Math.round((grossCents * percent) / 100) + (fee.fixedCents || 0);
  const feeCents = Math.max(0, Math.min(rawFee, grossCents));

  return { feeCents, netCents: grossCents - feeCents };
}

export function isFeeEligible(method: PaymentMethod): boolean {
  return FEE_ELIGIBLE_METHODS.has(method);
}

/**
 * Valor de `installments` a PERSISTIR em `transactions`/`services`.
 * NÃO faz clamp de faixa fora de alcance — isso é responsabilidade de
 * rejeição do DTO (camada de interface), não desta função de domínio.
 */
export function normalizeInstallments(
  method: PaymentMethod,
  raw: number | null | undefined,
): number | null {
  if (method !== "credit_card") {
    return null;
  }

  return raw ?? 1;
}

/**
 * Chave de BUSCA na config de taxa: reconcilia o `installments` NOT NULL
 * DEFAULT 1 das tabelas de config com o valor nullable das tabelas de
 * negócio (`transactions`/`services`).
 */
export function feeTierFor(
  method: PaymentMethod,
  installments: number | null,
): number {
  return method === "credit_card" ? (installments ?? 1) : 1;
}

export type FeeSource = "member" | "org" | "none";

export interface ResolvedFee {
  config: FeeConfig | null;
  source: FeeSource;
  configId: string | null;
}

export function resolveFee(
  method: PaymentMethod,
  installments: number | null,
  memberFee: MemberPaymentFeeEntity | null,
  orgFee: PaymentFeeEntity | null,
): ResolvedFee {
  if (!isFeeEligible(method)) {
    return { config: null, source: "none", configId: null };
  }

  const tier = feeTierFor(method, installments);

  if (memberFee && memberFee.active && memberFee.installments === tier) {
    return {
      config: { percent: memberFee.percent, fixedCents: memberFee.fixedCents },
      source: "member",
      configId: memberFee.id,
    };
  }

  if (orgFee && orgFee.installments === tier) {
    return {
      config: { percent: orgFee.percent, fixedCents: orgFee.fixedCents },
      source: "org",
      configId: null,
    };
  }

  return { config: null, source: "none", configId: null };
}
