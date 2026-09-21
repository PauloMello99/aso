export const MEMBER_PAYMENT_DEFAULT_DESCRIPTION = "Pagamento a funcionário";

export interface BuildMemberPaymentTransactionDescriptionInput {
  beneficiaryName: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  note?: string | null;
}

// YYYY-MM-DD -> dd/MM/yyyy por split (nunca new Date: evita virar o dia anterior por fuso).
function formatIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

// Descricao da transacao do caixa: contexto que NAO e coluna do caixa
// (beneficiario, periodo, observacao). Valor/meio/categoria/data/autor ficam de fora.
export function buildMemberPaymentTransactionDescription(
  input: BuildMemberPaymentTransactionDescriptionInput,
): string {
  const name = input.beneficiaryName.trim() || "funcionário";
  let description = `Pagamento a ${name}`;

  if (input.periodStart && input.periodEnd) {
    description += ` (${formatIsoDate(input.periodStart)} a ${formatIsoDate(input.periodEnd)})`;
  }

  const note = input.note?.trim();
  if (note && note !== MEMBER_PAYMENT_DEFAULT_DESCRIPTION) {
    description += ` — ${note}`;
  }

  return description;
}
