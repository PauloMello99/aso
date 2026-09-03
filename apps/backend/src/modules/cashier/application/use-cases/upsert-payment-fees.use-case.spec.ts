import { UpsertPaymentFeesUseCase } from "./upsert-payment-fees.use-case";
import { IPaymentFeeRepository } from "../../domain/payment-fee.repository.interface";
import { PaymentFeeEntity } from "../../domain/payment-fee.entity";
import { IOrganizationRepository } from "../../../organizations/domain/org.repository.interface";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";
import { AuditService } from "../../../audit/audit.service";

function buildFee(
  overrides: Partial<Parameters<typeof PaymentFeeEntity.create>[0]> = {},
): PaymentFeeEntity {
  return PaymentFeeEntity.create({
    id: "fee-1",
    orgId: "org-1",
    paymentMethod: "credit_card",
    percent: "3.50",
    fixedCents: 0,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeFeeRepo(
  overrides: Partial<jest.Mocked<IPaymentFeeRepository>> = {},
): jest.Mocked<IPaymentFeeRepository> {
  return {
    findByOrg: jest.fn().mockResolvedValue([]),
    findByOrgAndMethod: jest.fn(),
    upsert: jest.fn().mockResolvedValue(buildFee()),
    ...overrides,
  } as unknown as jest.Mocked<IPaymentFeeRepository>;
}

function buildFakeOrgRepo(
  overrides: Partial<jest.Mocked<IOrganizationRepository>> = {},
): jest.Mocked<IOrganizationRepository> {
  return {
    findAllByAuthId: jest.fn(),
    findByIdAndAuthId: jest.fn(),
    findBySlugAndAuthId: jest.fn(),
    isOwner: jest.fn().mockResolvedValue(true),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IOrganizationRepository>;
}

function buildFakeAuditService(
  overrides: Partial<jest.Mocked<AuditService>> = {},
): jest.Mocked<AuditService> {
  return {
    log: jest.fn(),
    logByAuthId: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<AuditService>;
}

describe("UpsertPaymentFeesUseCase", () => {
  it("lança CashierForbiddenException quando o autor não é owner e nunca audita", async () => {
    const feeRepo = buildFakeFeeRepo();
    const orgRepo = buildFakeOrgRepo({ isOwner: jest.fn().mockResolvedValue(false) });
    const auditService = buildFakeAuditService();
    const useCase = new UpsertPaymentFeesUseCase(feeRepo, orgRepo, auditService);

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "not-owner",
        fees: [{ paymentMethod: "credit_card", percent: "3.50", fixedCents: 0 }],
      }),
    ).rejects.toBeInstanceOf(CashierForbiddenException);
    expect(feeRepo.upsert).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("audita cashier_fees_updated uma única vez com previousPercent/previousFixedCents capturados antes do upsert", async () => {
    const feeRepo = buildFakeFeeRepo({
      findByOrg: jest
        .fn()
        .mockResolvedValue([buildFee({ paymentMethod: "credit_card", percent: "3.50", fixedCents: 0 })]),
    });
    const orgRepo = buildFakeOrgRepo();
    const auditService = buildFakeAuditService();
    const useCase = new UpsertPaymentFeesUseCase(feeRepo, orgRepo, auditService);

    await useCase.execute({
      orgId: "org-1",
      authId: "owner-1",
      fees: [
        { paymentMethod: "credit_card", percent: "4.00", fixedCents: 0 },
        { paymentMethod: "debit_card", percent: "2.00", fixedCents: 0 },
      ],
    });

    expect(feeRepo.upsert).toHaveBeenCalledTimes(2);
    expect(auditService.logByAuthId).toHaveBeenCalledTimes(1);
    expect(auditService.logByAuthId).toHaveBeenCalledWith("owner-1", {
      orgId: "org-1",
      action: "cashier_fees_updated",
      entityType: "payment_fees",
      entityId: "org-1",
      metadata: {
        scope: "org",
        changes: [
          {
            paymentMethod: "credit_card",
            previousPercent: "3.50",
            previousFixedCents: 0,
            percent: "4.00",
            fixedCents: 0,
          },
          {
            paymentMethod: "debit_card",
            previousPercent: null,
            previousFixedCents: null,
            percent: "2.00",
            fixedCents: 0,
          },
        ],
      },
    });
  });

  it("não audita quando as taxas enviadas são idênticas às vigentes, mas ainda faz upsert (idempotente)", async () => {
    const feeRepo = buildFakeFeeRepo({
      findByOrg: jest
        .fn()
        .mockResolvedValue([buildFee({ paymentMethod: "credit_card", percent: "3.50", fixedCents: 0 })]),
    });
    const orgRepo = buildFakeOrgRepo();
    const auditService = buildFakeAuditService();
    const useCase = new UpsertPaymentFeesUseCase(feeRepo, orgRepo, auditService);

    await useCase.execute({
      orgId: "org-1",
      authId: "owner-1",
      fees: [{ paymentMethod: "credit_card", percent: "3.50", fixedCents: 0 }],
    });

    expect(feeRepo.upsert).toHaveBeenCalledTimes(1);
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });
});
