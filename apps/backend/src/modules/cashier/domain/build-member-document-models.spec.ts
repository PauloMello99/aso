import {
  buildReceiptModel,
  buildReportModel,
} from "./build-member-document-models";
import { MemberPaymentEntity } from "./member-payment.entity";
import { ServiceEntity } from "../../services/domain/service.entity";

function buildPayment(
  overrides: Partial<Parameters<typeof MemberPaymentEntity.create>[0]> = {},
): MemberPaymentEntity {
  return MemberPaymentEntity.create({
    id: "payment-1",
    orgId: "org-1",
    userId: "user-A",
    transactionId: "tx-1",
    amountCents: 50000,
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    description: "Pagamento a funcionário",
    reversesPaymentId: null,
    createdBy: "user-O",
    createdAt: new Date("2026-09-01T10:00:00Z"),
    ...overrides,
  });
}

function buildService(
  overrides: Partial<Parameters<typeof ServiceEntity.create>[0]> = {},
): ServiceEntity {
  return ServiceEntity.create({
    id: "service-1",
    orgId: "org-1",
    serviceTypeId: null,
    customerId: "customer-1",
    paymentTransactionId: "tx-s1",
    anamnesisResponseId: null,
    performedBy: "user-A",
    createdBy: "user-A",
    description: null,
    amountCents: 20000,
    paymentMethod: "cash",
    commissionConfigId: null,
    commissionPercent: null,
    commissionMode: null,
    commissionBaseCents: 20000,
    commissionCents: 10000,
    performedAt: new Date("2026-09-05T15:00:00Z"),
    canceledAt: null,
    createdAt: new Date("2026-09-05T15:00:00Z"),
    updatedAt: new Date("2026-09-05T15:00:00Z"),
    customerName: "Cliente X",
    typeName: "Tatuagem",
    ...overrides,
  });
}

describe("buildReceiptModel", () => {
  const base = {
    studioName: "Estúdio Ink",
    memberName: "Ana",
    memberEmail: "ana@example.com",
    payment: buildPayment(),
    paymentMethod: "bank_transfer" as const,
    issuedAt: new Date("2026-09-19T12:00:00Z"),
  };

  it("copia os dados do pagamento em centavos", () => {
    const model = buildReceiptModel({ ...base, reversed: false, reversal: null });

    expect(model).toMatchObject({
      amountCents: 50000,
      paymentMethod: "bank_transfer",
      paymentId: "payment-1",
      transactionId: "tx-1",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-31",
      reversed: false,
      reversedAt: null,
    });
  });

  it("marca estornado com a data da linha de estorno", () => {
    const reversal = buildPayment({
      id: "payment-rev",
      reversesPaymentId: "payment-1",
      createdAt: new Date("2026-09-10T10:00:00Z"),
    });

    const model = buildReceiptModel({ ...base, reversed: true, reversal });

    expect(model.reversed).toBe(true);
    expect(model.reversedAt).toEqual(new Date("2026-09-10T10:00:00Z"));
  });
});

describe("buildReportModel", () => {
  it("descarta cancelados/estornos, exclui estornados do total pago e usa snapshots", () => {
    const model = buildReportModel({
      studioName: "Estúdio Ink",
      memberName: "Ana",
      memberEmail: "ana@example.com",
      periodFrom: "2026-09-01",
      periodTo: "2026-09-30",
      issuedAt: new Date("2026-09-19T12:00:00Z"),
      services: [
        buildService(),
        buildService({ id: "service-2", canceledAt: new Date() }),
        buildService({
          id: "service-3",
          paymentTransactionId: null,
          typeName: null,
          description: "Retoque",
        }),
      ],
      payments: [
        buildPayment({ id: "p1", amountCents: 3000 }),
        buildPayment({ id: "p2", amountCents: 2000 }),
        buildPayment({ id: "p-rev", reversesPaymentId: "p2", amountCents: 2000 }),
      ],
      reversedPaymentIds: new Set(["p2"]),
      grossRevenueCents: 20000,
      feesCents: 1000,
      commissionCents: 10000,
    });

    expect(model.servicesCount).toBe(2);
    expect(model.services.map((s) => [s.serviceName, s.paid])).toEqual([
      ["Tatuagem", true],
      ["Retoque", false],
    ]);
    expect(model.payments).toHaveLength(2);
    expect(model.payments.find((p) => p.reversed)?.amountCents).toBe(2000);
    expect(model.totals).toEqual({
      grossRevenueCents: 20000,
      feesCents: 1000,
      commissionCents: 10000,
      paidNetCents: 3000,
      periodBalanceCents: 7000,
      studioShareCents: 9000,
    });
  });

  it("saldo do período pode ficar negativo (pago > comissão)", () => {
    const model = buildReportModel({
      studioName: "E",
      memberName: "A",
      memberEmail: "",
      periodFrom: "2026-09-01",
      periodTo: "2026-09-30",
      issuedAt: new Date(),
      services: [],
      payments: [buildPayment({ amountCents: 5000 })],
      reversedPaymentIds: new Set(),
      grossRevenueCents: 0,
      feesCents: 0,
      commissionCents: 1000,
    });

    expect(model.totals.periodBalanceCents).toBe(-4000);
  });
});
