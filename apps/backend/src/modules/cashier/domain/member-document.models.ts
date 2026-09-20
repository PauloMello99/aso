import type { PaymentMethod } from "./transaction.entity";

// Modelos de dados dos PDFs de membro. Valores monetarios em CENTAVOS inteiros
// ate a borda — a formatacao BRL/pt-BR so acontece no gerador de PDF.

export interface ReceiptModel {
  studioName: string;
  memberName: string;
  memberEmail: string;
  amountCents: number;
  paidAt: Date;
  /** YYYY-MM-DD */
  periodStart: string | null;
  periodEnd: string | null;
  paymentMethod: PaymentMethod;
  description: string | null;
  paymentId: string;
  transactionId: string;
  issuedAt: Date;
  reversed: boolean;
  /** Data da linha de estorno, se encontrada. */
  reversedAt: Date | null;
}

export interface ReportServiceRow {
  performedAt: Date;
  customerName: string | null;
  serviceName: string;
  amountCents: number;
  paid: boolean;
}

export interface ReportPaymentRow {
  paidAt: Date;
  amountCents: number;
  periodStart: string | null;
  periodEnd: string | null;
  reversed: boolean;
}

export interface ReportTotals {
  /** Receita bruta dos servicos PAGOS no periodo (snapshot). */
  grossRevenueCents: number;
  /** Taxas retidas (transactions.fee_cents) desses servicos. */
  feesCents: number;
  /** Comissao do membro devida no periodo (snapshot em services). */
  commissionCents: number;
  /** Pagamentos ao membro no periodo, liquido de estornados. */
  paidNetCents: number;
  /** commissionCents - paidNetCents (pode ser negativo). */
  periodBalanceCents: number;
  /** grossRevenueCents - feesCents - commissionCents. */
  studioShareCents: number;
}

export interface ReportModel {
  studioName: string;
  memberName: string;
  memberEmail: string;
  /** YYYY-MM-DD */
  periodFrom: string;
  periodTo: string;
  issuedAt: Date;
  servicesCount: number;
  services: ReportServiceRow[];
  payments: ReportPaymentRow[];
  totals: ReportTotals;
}
