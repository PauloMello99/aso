import type { PaymentMethod } from "../../domain/transaction.entity";
import type { ReceiptModel } from "../../domain/member-document.models";

const TIME_ZONE = "America/Sao_Paulo";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Dinheiro",
  bank_transfer: "Transferência / Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
};

// Centavos inteiros -> "R$ 1.234,56" (sem Intl: independe de ICU e nao insere
// NBSP). Negativo: "-R$ 10,00".
export function formatBrl(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const reais = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const centavos = (abs % 100).toString().padStart(2, "0");
  return `${negative ? "-" : ""}R$ ${reais},${centavos}`;
}

export function formatDateBr(date: Date): string {
  return date.toLocaleDateString("pt-BR", { timeZone: TIME_ZONE });
}

export function formatDateTimeBr(date: Date): string {
  return date.toLocaleString("pt-BR", { timeZone: TIME_ZONE });
}

// "YYYY-MM-DD" -> "DD/MM/YYYY" por fatiamento (sem new Date: evita deslocar
// um dia por fuso).
export function formatIsoDateBr(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function formatReferencePeriod(
  start: string | null,
  end: string | null,
): string {
  if (start && end) return `${formatIsoDateBr(start)} a ${formatIsoDateBr(end)}`;
  if (start) return `a partir de ${formatIsoDateBr(start)}`;
  if (end) return `até ${formatIsoDateBr(end)}`;
  return "-";
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}

// Linhas rotulo/valor do recibo — montadas aqui (puro) para o teste conferir
// os textos-chave sem depender de extrair texto do PDF.
export function buildReceiptRows(model: ReceiptModel): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ["Estúdio", model.studioName],
    [
      "Profissional",
      model.memberEmail
        ? `${model.memberName} (${model.memberEmail})`
        : model.memberName,
    ],
    ["Valor", formatBrl(model.amountCents)],
    ["Data do pagamento", formatDateBr(model.paidAt)],
    [
      "Período de referência",
      formatReferencePeriod(model.periodStart, model.periodEnd),
    ],
    ["Método de pagamento", PAYMENT_METHOD_LABELS[model.paymentMethod]],
    ["Descrição", model.description ?? "-"],
    ["Pagamento", shortId(model.paymentId)],
    ["Transação", shortId(model.transactionId)],
    ["Emitido em", formatDateTimeBr(model.issuedAt)],
  ];
  return rows;
}

export function reversedBanner(model: ReceiptModel): string | null {
  if (!model.reversed) return null;
  return model.reversedAt
    ? `ESTORNADO em ${formatDateBr(model.reversedAt)}`
    : "ESTORNADO";
}
