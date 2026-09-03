import { CreateTransactionUseCase } from "./create-transaction.use-case";
import { ITransactionRepository } from "../../domain/transaction.repository.interface";
import { TransactionEntity } from "../../domain/transaction.entity";
import { IPaymentFeeRepository } from "../../domain/payment-fee.repository.interface";
import { PaymentFeeEntity } from "../../domain/payment-fee.entity";
import { IMemberPaymentFeeRepository } from "../../domain/member-payment-fee.repository.interface";
import { MemberPaymentFeeEntity } from "../../domain/member-payment-fee.entity";
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

function buildMemberFee(
  overrides: Partial<Parameters<typeof MemberPaymentFeeEntity.create>[0]> = {},
): MemberPaymentFeeEntity {
  return MemberPaymentFeeEntity.create({
    id: "member-fee-1",
    orgId: "org-1",
    userId: "user-1",
    paymentMethod: "credit_card",
    percent: "3.50",
    fixedCents: 50,
    active: true,
    supersededAt: null,
    createdBy: "owner-1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildOrgFee(
  overrides: Partial<Parameters<typeof PaymentFeeEntity.create>[0]> = {},
): PaymentFeeEntity {
  return PaymentFeeEntity.create({
    id: "org-fee-1",
    orgId: "org-1",
    paymentMethod: "credit_card",
    percent: "2.00",
    fixedCents: 10,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeMemberFeeRepo(
  overrides: Partial<jest.Mocked<IMemberPaymentFeeRepository>> = {},
): jest.Mocked<IMemberPaymentFeeRepository> {
  return {
    findActiveByOrg: jest.fn().mockResolvedValue([]),
    findActiveByOrgUserAndMethod: jest.fn().mockResolvedValue(null),
    supersede: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberPaymentFeeRepository>;
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
    const memberFeeRepo = buildFakeMemberFeeRepo();
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
      memberFeeRepo,
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
        feeSource: "none",
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
    const memberFeeRepo = buildFakeMemberFeeRepo();
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new CreateTransactionUseCase(
      transactionRepo,
      feeRepo,
      memberFeeRepo,
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
    const memberFeeRepo = buildFakeMemberFeeRepo();
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new CreateTransactionUseCase(
      transactionRepo,
      feeRepo,
      memberFeeRepo,
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

  it("no caminho de correção (trustedCreatedBy definido) não consulta a taxa do membro e usa a taxa da org", async () => {
    const transactionRepo = buildFakeTransactionRepo({
      create: jest.fn().mockResolvedValue(buildTransaction({ id: "tx-5" })),
    });
    const feeRepo = buildFakeFeeRepo({
      findByOrgAndMethod: jest
        .fn()
        .mockResolvedValue(buildOrgFee({ percent: "3.50", fixedCents: 100 })),
    });
    const memberFeeRepo = buildFakeMemberFeeRepo();
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new CreateTransactionUseCase(
      transactionRepo,
      feeRepo,
      memberFeeRepo,
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

    expect(memberFeeRepo.findActiveByOrgUserAndMethod).not.toHaveBeenCalled();
    expect(transactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        feeCents: 450,
        netCents: 9550,
        feeConfigId: null,
        feePercent: "3.50",
        feeFixedCents: 100,
        feeSource: "org",
      }),
    );
    expect(auditService.logByAuthId).toHaveBeenCalledWith(
      "auth-owner-1",
      expect.objectContaining({
        metadata: expect.objectContaining({
          grossCents: 10000,
          feeCents: 450,
          netCents: 9550,
          feeSource: "org",
        }),
      }),
    );
  });

  it("correção com MESMO método e snapshot fee_source=member: reusa o snapshot do original e só recomputa feeCents/netCents sobre o novo gross", async () => {
    const transactionRepo = buildFakeTransactionRepo({
      create: jest.fn().mockResolvedValue(buildTransaction({ id: "tx-10" })),
    });
    const feeRepo = buildFakeFeeRepo();
    const memberFeeRepo = buildFakeMemberFeeRepo();
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new CreateTransactionUseCase(
      transactionRepo,
      feeRepo,
      memberFeeRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-system",
      trustedCreatedBy: "user-1",
      originalFee: {
        paymentMethod: "credit_card",
        feePercent: "5.00",
        feeFixedCents: 0,
        feeSource: "member",
        feeConfigId: "member-fee-9",
      },
      description: "Correção de valor",
      type: "income",
      grossCents: 12000,
      paymentMethod: "credit_card",
    });

    expect(memberFeeRepo.findActiveByOrgUserAndMethod).not.toHaveBeenCalled();
    expect(feeRepo.findByOrgAndMethod).not.toHaveBeenCalled();
    // 5.00% de 12000 = 600 (percentual do snapshot sobre o novo gross)
    expect(transactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        grossCents: 12000,
        feeCents: 600,
        netCents: 11400,
        feeConfigId: "member-fee-9",
        feePercent: "5.00",
        feeFixedCents: 0,
        feeSource: "member",
      }),
    );
  });

  it("correção com método de pagamento DIFERENTE do original: descarta o snapshot e reprecifica pela ORG", async () => {
    const transactionRepo = buildFakeTransactionRepo({
      create: jest.fn().mockResolvedValue(buildTransaction({ id: "tx-11" })),
    });
    const feeRepo = buildFakeFeeRepo({
      findByOrgAndMethod: jest.fn().mockResolvedValue(
        buildOrgFee({
          paymentMethod: "debit_card",
          percent: "2.00",
          fixedCents: 10,
        }),
      ),
    });
    const memberFeeRepo = buildFakeMemberFeeRepo();
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new CreateTransactionUseCase(
      transactionRepo,
      feeRepo,
      memberFeeRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-system",
      trustedCreatedBy: "user-1",
      originalFee: {
        paymentMethod: "credit_card",
        feePercent: "5.00",
        feeFixedCents: 0,
        feeSource: "member",
        feeConfigId: "member-fee-9",
      },
      description: "Correção trocando crédito por débito",
      type: "income",
      grossCents: 10000,
      paymentMethod: "debit_card",
    });

    expect(memberFeeRepo.findActiveByOrgUserAndMethod).not.toHaveBeenCalled();
    // 2.00% de 10000 = 200, + 10 fixos = 210 (taxa da ORG para o novo método)
    expect(transactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        feeCents: 210,
        netCents: 9790,
        feeConfigId: null,
        feePercent: "2.00",
        feeFixedCents: 10,
        feeSource: "org",
      }),
    );
  });

  it("correção com MESMO método e snapshot fee_source=org: mantém os números do snapshot sem re-consultar a ORG", async () => {
    const transactionRepo = buildFakeTransactionRepo({
      create: jest.fn().mockResolvedValue(buildTransaction({ id: "tx-12" })),
    });
    const feeRepo = buildFakeFeeRepo({
      // A taxa da ORG hoje é outra (10%) — não pode ser consultada nem aplicada.
      findByOrgAndMethod: jest
        .fn()
        .mockResolvedValue(buildOrgFee({ percent: "10.00", fixedCents: 999 })),
    });
    const memberFeeRepo = buildFakeMemberFeeRepo();
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new CreateTransactionUseCase(
      transactionRepo,
      feeRepo,
      memberFeeRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-system",
      trustedCreatedBy: "user-1",
      originalFee: {
        paymentMethod: "credit_card",
        feePercent: "2.00",
        feeFixedCents: 10,
        feeSource: "org",
        feeConfigId: null,
      },
      description: "Correção de valor",
      type: "income",
      grossCents: 12000,
      paymentMethod: "credit_card",
    });

    expect(feeRepo.findByOrgAndMethod).not.toHaveBeenCalled();
    expect(memberFeeRepo.findActiveByOrgUserAndMethod).not.toHaveBeenCalled();
    // 2.00% de 12000 = 240, + 10 fixos = 250 (snapshot original, não a taxa atual)
    expect(transactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        feeCents: 250,
        netCents: 11750,
        feeConfigId: null,
        feePercent: "2.00",
        feeFixedCents: 10,
        feeSource: "org",
      }),
    );
  });

  it("correção de um outcome com MESMO método: nunca aplica taxa (feeCents 0, feeSource none) mesmo com snapshot no original", async () => {
    const transactionRepo = buildFakeTransactionRepo({
      create: jest.fn().mockResolvedValue(buildTransaction({ id: "tx-13" })),
    });
    const feeRepo = buildFakeFeeRepo();
    const memberFeeRepo = buildFakeMemberFeeRepo();
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new CreateTransactionUseCase(
      transactionRepo,
      feeRepo,
      memberFeeRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-system",
      trustedCreatedBy: "user-1",
      originalFee: {
        paymentMethod: "credit_card",
        feePercent: "5.00",
        feeFixedCents: 0,
        feeSource: "member",
        feeConfigId: "member-fee-9",
      },
      description: "Correção de uma despesa",
      type: "outcome",
      grossCents: 12000,
      paymentMethod: "credit_card",
    });

    expect(feeRepo.findByOrgAndMethod).not.toHaveBeenCalled();
    expect(memberFeeRepo.findActiveByOrgUserAndMethod).not.toHaveBeenCalled();
    expect(transactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        feeCents: 0,
        netCents: 12000,
        feeConfigId: null,
        feePercent: null,
        feeFixedCents: null,
        feeSource: "none",
      }),
    );
  });

  it("income com funcionário que tem taxa própria ativa: grava o snapshot da taxa do membro", async () => {
    const transactionRepo = buildFakeTransactionRepo({
      create: jest.fn().mockResolvedValue(buildTransaction({ id: "tx-6" })),
    });
    const feeRepo = buildFakeFeeRepo({
      findByOrgAndMethod: jest
        .fn()
        .mockResolvedValue(buildOrgFee({ percent: "2.00", fixedCents: 10 })),
    });
    const memberFeeRepo = buildFakeMemberFeeRepo({
      findActiveByOrgUserAndMethod: jest
        .fn()
        .mockResolvedValue(
          buildMemberFee({ percent: "3.50", fixedCents: 50 }),
        ),
    });
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new CreateTransactionUseCase(
      transactionRepo,
      feeRepo,
      memberFeeRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner-1",
      description: "Sessão paga no cartão",
      type: "income",
      grossCents: 10000,
      paymentMethod: "credit_card",
    });

    expect(memberFeeRepo.findActiveByOrgUserAndMethod).toHaveBeenCalledWith(
      "org-1",
      "user-1",
      "credit_card",
    );
    // 3.50% de 10000 = 350, + 50 fixos = 400
    expect(transactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        feeCents: 400,
        netCents: 9600,
        feeConfigId: "member-fee-1",
        feePercent: "3.50",
        feeFixedCents: 50,
        feeSource: "member",
      }),
    );
  });

  it("income sem taxa do membro mas com taxa da org: grava o snapshot da org sem feeConfigId", async () => {
    const transactionRepo = buildFakeTransactionRepo({
      create: jest.fn().mockResolvedValue(buildTransaction({ id: "tx-7" })),
    });
    const feeRepo = buildFakeFeeRepo({
      findByOrgAndMethod: jest
        .fn()
        .mockResolvedValue(buildOrgFee({ percent: "2.00", fixedCents: 10 })),
    });
    const memberFeeRepo = buildFakeMemberFeeRepo();
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new CreateTransactionUseCase(
      transactionRepo,
      feeRepo,
      memberFeeRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner-1",
      description: "Sessão paga no cartão",
      type: "income",
      grossCents: 10000,
      paymentMethod: "credit_card",
    });

    // 2.00% de 10000 = 200, + 10 fixos = 210
    expect(transactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        feeCents: 210,
        netCents: 9790,
        feeConfigId: null,
        feePercent: "2.00",
        feeFixedCents: 10,
        feeSource: "org",
      }),
    );
  });

  it("método não elegível (cash) no caminho manual: feeSource none e nenhum fee gravado", async () => {
    const transactionRepo = buildFakeTransactionRepo({
      create: jest.fn().mockResolvedValue(buildTransaction({ id: "tx-8" })),
    });
    const feeRepo = buildFakeFeeRepo();
    const memberFeeRepo = buildFakeMemberFeeRepo({
      findActiveByOrgUserAndMethod: jest.fn().mockResolvedValue(
        buildMemberFee({
          paymentMethod: "cash",
          percent: "9.99",
          fixedCents: 999,
        }),
      ),
    });
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new CreateTransactionUseCase(
      transactionRepo,
      feeRepo,
      memberFeeRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner-1",
      description: "Venda em dinheiro",
      type: "income",
      grossCents: 10000,
      paymentMethod: "cash",
    });

    expect(transactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        feeCents: 0,
        netCents: 10000,
        feeConfigId: null,
        feePercent: null,
        feeFixedCents: null,
        feeSource: "none",
      }),
    );
  });

  it("expense (outcome): comportamento de fee inalterado, feeSource none", async () => {
    const transactionRepo = buildFakeTransactionRepo({
      create: jest.fn().mockResolvedValue(buildTransaction({ id: "tx-9" })),
    });
    const feeRepo = buildFakeFeeRepo({
      findByOrgAndMethod: jest
        .fn()
        .mockResolvedValue(buildOrgFee({ percent: "3.50", fixedCents: 100 })),
    });
    const memberFeeRepo = buildFakeMemberFeeRepo({
      findActiveByOrgUserAndMethod: jest
        .fn()
        .mockResolvedValue(buildMemberFee()),
    });
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new CreateTransactionUseCase(
      transactionRepo,
      feeRepo,
      memberFeeRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner-1",
      description: "Compra de material no cartão",
      type: "outcome",
      grossCents: 10000,
      paymentMethod: "credit_card",
    });

    expect(feeRepo.findByOrgAndMethod).not.toHaveBeenCalled();
    expect(memberFeeRepo.findActiveByOrgUserAndMethod).not.toHaveBeenCalled();
    expect(transactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        feeCents: 0,
        netCents: 10000,
        feeConfigId: null,
        feePercent: null,
        feeFixedCents: null,
        feeSource: "none",
      }),
    );
  });
});
