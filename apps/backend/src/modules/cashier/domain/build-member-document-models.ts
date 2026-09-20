import type { MemberPaymentEntity } from "./member-payment.entity";
import type { PaymentMethod } from "./transaction.entity";
import type {
  ReceiptModel,
  ReportModel,
  ReportPaymentRow,
  ReportServiceRow,
} from "./member-document.models";
import type { ServiceEntity } from "../../services/domain/service.entity";

export interface BuildReceiptModelInput {
  studioName: string;
  memberName: string;
  memberEmail: string;
  payment: MemberPaymentEntity;
  paymentMethod: PaymentMethod;
  reversed: boolean;
  /** Linha de estorno do pagamento (quando localizada na lista do membro). */
  reversal: MemberPaymentEntity | null;
  issuedAt: Date;
}

export function buildReceiptModel(input: BuildReceiptModelInput): ReceiptModel {
  const { payment } = input;
  return {
    studioName: input.studioName,
    memberName: input.memberName,
    memberEmail: input.memberEmail,
    amountCents: payment.amountCents,
    paidAt: payment.createdAt,
    periodStart: payment.periodStart,
    periodEnd: payment.periodEnd,
    paymentMethod: input.paymentMethod,
    description: payment.description,
    paymentId: payment.id,
    transactionId: payment.transactionId,
    issuedAt: input.issuedAt,
    reversed: input.reversed,
    reversedAt: input.reversed && input.reversal ? input.reversal.createdAt : null,
  };
}

export interface BuildReportModelInput {
  studioName: string;
  memberName: string;
  memberEmail: string;
  periodFrom: string;
  periodTo: string;
  issuedAt: Date;
  /** Servicos do membro no periodo (cancelados sao descartados aqui). */
  services: ServiceEntity[];
  /** Pagamentos (sem linhas de estorno) do membro dentro do periodo. */
  payments: MemberPaymentEntity[];
  reversedPaymentIds: ReadonlySet<string>;
  /** Totais vindos dos SNAPSHOTS persistidos (nunca recalculados). */
  grossRevenueCents: number;
  feesCents: number;
  commissionCents: number;
}

export function buildReportModel(input: BuildReportModelInput): ReportModel {
  const services: ReportServiceRow[] = input.services
    .filter((service) => !service.isCanceled)
    .map((service) => ({
      performedAt: service.performedAt,
      customerName: service.customerName,
      serviceName: service.typeName ?? service.description ?? "Sem tipo",
      amountCents: service.amountCents,
      paid: service.paymentTransactionId !== null,
    }));

  const payments: ReportPaymentRow[] = input.payments
    .filter((payment) => !payment.isReversal)
    .map((payment) => ({
      paidAt: payment.createdAt,
      amountCents: payment.amountCents,
      periodStart: payment.periodStart,
      periodEnd: payment.periodEnd,
      reversed: input.reversedPaymentIds.has(payment.id),
    }));

  const paidNetCents = payments
    .filter((payment) => !payment.reversed)
    .reduce((sum, payment) => sum + payment.amountCents, 0);

  return {
    studioName: input.studioName,
    memberName: input.memberName,
    memberEmail: input.memberEmail,
    periodFrom: input.periodFrom,
    periodTo: input.periodTo,
    issuedAt: input.issuedAt,
    servicesCount: services.length,
    services,
    payments,
    totals: {
      grossRevenueCents: input.grossRevenueCents,
      feesCents: input.feesCents,
      commissionCents: input.commissionCents,
      paidNetCents,
      periodBalanceCents: input.commissionCents - paidNetCents,
      studioShareCents:
        input.grossRevenueCents - input.feesCents - input.commissionCents,
    },
  };
}
