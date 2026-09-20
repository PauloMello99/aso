import type { PaymentMethod } from "../types"
import { PAYMENT_METHOD_LABELS } from "../types"

// Faixa de parcelas só é exibida para crédito com installments > 1 — método
// sem parcelamento ou 1x mantém o rótulo simples (evita "1x" redundante em
// toda entrada de crédito). Ver passo 21 do Bloco 3.
export function formatPaymentMethod(
  paymentMethod: PaymentMethod,
  installments: number | null,
): string {
  const base = PAYMENT_METHOD_LABELS[paymentMethod]
  if (
    paymentMethod === "credit_card" &&
    installments !== null &&
    installments > 1
  ) {
    return `${base} · ${installments}x`
  }
  return base
}
