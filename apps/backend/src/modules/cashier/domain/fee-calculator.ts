import type { PaymentMethod } from "./transaction.entity";

/** Apenas métodos de cartão sofrem taxa por padrão (reunião 11/06). */
const FEE_ELIGIBLE_METHODS: ReadonlySet<PaymentMethod> = new Set([
  "credit_card",
  "debit_card",
]);

export interface FeeConfig {
  /** Percentual como string numérica (ex.: "10.00"). */
  percent: string;
  /** Parcela fixa em centavos. */
  fixedCents: number;
}

export interface FeeResult {
  feeCents: number;
  netCents: number;
}

/**
 * Calcula taxa e líquido a partir do valor bruto.
 *
 * líquido = bruto - arredondar(bruto * percent/100 + fixedCents)
 *
 * Taxa só se aplica a métodos elegíveis (cartão). Para os demais, fee=0 e
 * net=gross. A taxa nunca excede o bruto (clamp em [0, gross]). Função pura —
 * reutilizável pelo módulo de Serviços para income automático.
 */
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
