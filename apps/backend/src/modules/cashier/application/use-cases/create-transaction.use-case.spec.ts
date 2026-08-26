import { CreateTransactionUseCase } from "./create-transaction.use-case";
import { ITransactionRepository } from "../../domain/transaction.repository.interface";
import { TransactionEntity } from "../../domain/transaction.entity";
import { IPaymentFeeRepository } from "../../domain/payment-fee.repository.interface";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { AuditService } from "../../../audit/audit.service";

function buildTransaction(
  overrides: Partial<Parameters<typeof TransactionEntity.create>[0]> = {},
): TransactionEntity {
  return TransactionEntity.create({
    id: "tx-1",
    orgId: "org-1",
    createdBy: "user-1",
    description: "Venda balcão",
    type: "income",
    netCents: 10000,
    grossCents: 10000,
    feeCents: 0,
    paymentMethod: "cash",
    categoryId: null,
    reversesTransactionId: null,
    transactedAt: new Date("2026-07-01T10:00:00Z"),
    createdAt: new Date("2026-07-01T10:00:00Z"),
    ...overrides,
  });
}

function buildMember(
  overrides: Partial<Parameters<typeof MemberEntity.create>[0]> = {},
): MemberEntity {
  return MemberEntity.create({
    memberId: "member-1",
    orgId: "org-1",
    userId: "user-1",
    role: "employee",
    enabled: true,
    permissions: [],
    userName: "Fulano",
    userEmail: "fulano@example.com",
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeTransactionRepo(
  overrides: Partial<jest.Mocked<ITransactionRepository>> = {},
): jest.Mocked<ITransactionRepository> {
  return {
    create: jest.fn().mockResolvedValue(buildTransaction()),
    findById: jest.fn(),
    findAllByOrg: jest.fn(),
    findReversalOf: jest.fn(),
    findReversedIds: jest.fn(),
    balance: jest.fn(),
    dailyBalanceHistory: jest.fn(),
    incomeByPaymentMethod: jest.fn(),
    incomeExpenseSeries: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITransactionRepository>;
}

function buildFakeFeeRepo(
  overrides: Partial<jest.Mocked<IPaymentFeeRepository>> = {},
): jest.Mocked<IPaymentFeeRepository> {
  return {
    findByOrg: jest.fn(),
    findByOrgAndMethod: jest.fn().mockResolvedValue(null),
    upsert: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IPaymentFeeRepository>;
}

function buildFakeMemberRepo(
  overrides: Partial<jest.Mocked<IMemberRepository>> = {},
): jest.Mocked<IMemberRepository> {
  return {
    findAllByOrg: jest.fn(),
    upsert: jest.fn(),
    findByMemberId: jest.fn(),
    findByAuthId: jest
      .fn()
      .mockResolvedValue(buildMember({ userId: "user-1", role: "employee" })),
    updateRole: jest.fn(),
    updatePermissions: jest.fn(),
    setEnabled: jest.fn(),
    countActiveOwners: jest.fn(),
    countOwnedOrgs: jest.fn(),
    removeAllByUserId: jest.fn(),
    transferOwnership: jest.fn(),
    remove: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberRepository>;
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

describe("CreateTransactionUseCase", () => {
  it("audita cashier_transaction_created com o autor real, mesmo quando o lançamento é atribuído a outro membro", async () => {
    const transactionRepo = buildFakeTransactionRepo({
      create: jest.fn().mockResolvedValue(
        buildTransaction({ createdBy: "other-user", id: "tx-2" }),
      ),
    });
    const feeRepo = buildFakeFeeRepo();
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest
        .fn()
        .mockResolvedValue(buildMember({ userId: "owner-1", role: "owner" })),
      findAllByOrg: jest
        .fn()
        .mockResolvedValue([buildMember({ userId: "other-user" })]),
    });
    const auditService = buildFakeAuditService();
    const useCase = new CreateTransactionUseCase(
      transactionRepo,
      feeRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner-1",
      createdBy: "other-user",
      description: "Sessão de tatuagem",
      type: "income",
      grossCents: 10000,
      paymentMethod: "cash",
    });

    expect(auditService.logByAuthId).toHaveBeenCalledTimes(1);
    expect(auditService.logByAuthId).toHaveBeenCalledWith("auth-owner-1", {
      orgId: "org-1",
      action: "cashier_transaction_created",
      entityType: "transaction",
      entityId: "tx-2",
      metadata: {
        type: "income",
        grossCents: 10000,
        feeCents: 0,
        netCents: 10000,
        paymentMethod: "cash",
        categoryId: null,
        attributedTo: "other-user",
        source: "manual",
        transactedAt: expect.any(Date),
      },
    });
  });

  it("audita com trustedCreatedBy sem chamar resolveActor/resolveCreatedBy, marcando source=correction e attributedTo=null (createdBy vem de coluna com id heterogêneo)", async () => {
    const transactionRepo = buildFakeTransactionRepo({
      create: jest.fn().mockResolvedValue(buildTransaction({ id: "tx-3" })),
    });
    const feeRepo = buildFakeFeeRepo();
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new CreateTransactionUseCase(
      transactionRepo,
      feeRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-system",
      trustedCreatedBy: "user-9",
      description: "Correção automática",
      type: "outcome",
      grossCents: 5000,
      paymentMethod: "cash",
    });

    expect(memberRepo.findByAuthId).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).toHaveBeenCalledWith(
      "auth-system",
      expect.objectContaining({
        action: "cashier_transaction_created",
        entityId: "tx-3",
        metadata: expect.objectContaining({
          attributedTo: null,
          source: "correction",
        }),
      }),
    );
  });

  it("não exclui o campo description do lançamento em si, mas mantém metadata do audit sem texto livre", async () => {
    const transactionRepo = buildFakeTransactionRepo({
      create: jest.fn().mockResolvedValue(buildTransaction({ id: "tx-4" })),
    });
    const feeRepo = buildFakeFeeRepo();
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new CreateTransactionUseCase(
      transactionRepo,
      feeRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner-1",
      trustedCreatedBy: "user-1",
      description: "Detalhe sensível do cliente",
      type: "income",
      grossCents: 10000,
      paymentMethod: "cash",
    });

    expect(transactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Detalhe sensível do cliente" }),
    );
    const metadata = auditService.logByAuthId.mock.calls[0][1].metadata as Record<
      string,
      unknown
    >;
    expect(metadata).not.toHaveProperty("description");
  });

  it("audita feeCents/netCents calculados de uma taxa real, não apenas os valores default do mock", async () => {
    const transactionRepo = buildFakeTransactionRepo({
      create: jest.fn().mockResolvedValue(buildTransaction({ id: "tx-5" })),
    });
    const feeRepo = buildFakeFeeRepo({
      findByOrgAndMethod: jest
        .fn()
        .mockResolvedValue({ percent: "3.50", fixedCents: 100 }),
    });
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new CreateTransactionUseCase(
      transactionRepo,
      feeRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner-1",
      trustedCreatedBy: "user-1",
      description: "Sessão paga no cartão",
      type: "income",
      grossCents: 10000,
      paymentMethod: "credit_card",
    });

    expect(auditService.logByAuthId).toHaveBeenCalledWith(
      "auth-owner-1",
      expect.objectContaining({
        metadata: expect.objectContaining({
          grossCents: 10000,
          feeCents: 450,
          netCents: 9550,
        }),
      }),
    );
  });
});
