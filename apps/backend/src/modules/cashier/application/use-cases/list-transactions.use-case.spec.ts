import { ListTransactionsUseCase } from "./list-transactions.use-case";
import { ITransactionRepository } from "../../domain/transaction.repository.interface";
import { TransactionEntity } from "../../domain/transaction.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { IServiceRepository } from "../../../services/domain/service.repository.interface";
import { IMemberPaymentRepository } from "../../domain/member-payment.repository.interface";

function buildFakeMemberPaymentRepo(
  overrides: Partial<jest.Mocked<IMemberPaymentRepository>> = {},
): jest.Mocked<IMemberPaymentRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    existsByTransactionId: jest.fn().mockResolvedValue(false),
    findTransactionIdsWithPayment: jest.fn().mockResolvedValue(new Set()),
    findAllByOrgAndUser: jest.fn(),
    findReversedIds: jest.fn(),
    netPaidCents: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberPaymentRepository>;
}

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

function buildFakeTransactionRepo(
  overrides: Partial<jest.Mocked<ITransactionRepository>> = {},
): jest.Mocked<ITransactionRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByOrg: jest.fn().mockResolvedValue([]),
    findReversalOf: jest.fn(),
    findReversedIds: jest.fn().mockResolvedValue(new Set()),
    balance: jest.fn(),
    dailyBalanceHistory: jest.fn(),
    incomeByPaymentMethod: jest.fn(),
    incomeExpenseSeries: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITransactionRepository>;
}

function buildFakeMemberRepo(
  overrides: Partial<jest.Mocked<IMemberRepository>> = {},
): jest.Mocked<IMemberRepository> {
  return {
    findByAuthId: jest.fn().mockResolvedValue(
      MemberEntity.create({
        memberId: "member-1",
        orgId: "org-1",
        userId: "user-1",
        role: "owner",
        enabled: true,
        permissions: [],
        userName: "User",
        userEmail: "user@example.com",
        joinedAt: new Date("2026-01-01T00:00:00Z"),
      }),
    ),
    updateRole: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberRepository>;
}

function buildFakeServiceRepo(
  overrides: Partial<jest.Mocked<IServiceRepository>> = {},
): jest.Mocked<IServiceRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByOrg: jest.fn(),
    setPaymentTransaction: jest.fn(),
    existsByPaymentTransactionId: jest.fn(),
    findServiceIdsByTransactionIds: jest.fn().mockResolvedValue(new Map()),
    markCanceled: jest.fn(),
    correctPayment: jest.fn(),
    update: jest.fn(),
    materialCostCentsByPeriod: jest.fn(),
    countAndRevenueByType: jest.fn(),
    countAndRevenueByProfessional: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IServiceRepository>;
}

describe("ListTransactionsUseCase", () => {
  it("retorna serviceId null para transação comum sem vínculo com serviço", async () => {
    const transaction = buildTransaction();
    const transactionRepo = buildFakeTransactionRepo({
      findAllByOrg: jest.fn().mockResolvedValue([transaction]),
    });
    const memberRepo = buildFakeMemberRepo();
    const serviceRepo = buildFakeServiceRepo({
      findServiceIdsByTransactionIds: jest.fn().mockResolvedValue(new Map()),
    });

    const useCase = new ListTransactionsUseCase(
      transactionRepo,
      memberRepo,
      serviceRepo,
      buildFakeMemberPaymentRepo(),
    );

    const result = await useCase.execute({ orgId: "org-1", authId: "auth-1" });

    expect(serviceRepo.findServiceIdsByTransactionIds).toHaveBeenCalledWith(
      "org-1",
      [transaction.id],
    );
    expect(result).toEqual([
      {
        entity: transaction,
        reversed: false,
        serviceId: null,
        isMemberPayment: false,
      },
    ]);
  });

  it("retorna serviceId preenchido quando a transação é pagamento de serviço", async () => {
    const transaction = buildTransaction({ id: "tx-service" });
    const transactionRepo = buildFakeTransactionRepo({
      findAllByOrg: jest.fn().mockResolvedValue([transaction]),
    });
    const memberRepo = buildFakeMemberRepo();
    const serviceRepo = buildFakeServiceRepo({
      findServiceIdsByTransactionIds: jest
        .fn()
        .mockResolvedValue(new Map([["tx-service", "service-1"]])),
    });

    const useCase = new ListTransactionsUseCase(
      transactionRepo,
      memberRepo,
      serviceRepo,
      buildFakeMemberPaymentRepo(),
    );

    const result = await useCase.execute({ orgId: "org-1", authId: "auth-1" });

    expect(result).toEqual([
      {
        entity: transaction,
        reversed: false,
        serviceId: "service-1",
        isMemberPayment: false,
      },
    ]);
  });

  it("retorna isMemberPayment true só para a transação de pagamento a membro", async () => {
    const memberPaymentTx = buildTransaction({ id: "tx-member", type: "outcome" });
    const plainTx = buildTransaction({ id: "tx-plain" });
    const transactionRepo = buildFakeTransactionRepo({
      findAllByOrg: jest.fn().mockResolvedValue([memberPaymentTx, plainTx]),
    });
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      findTransactionIdsWithPayment: jest
        .fn()
        .mockResolvedValue(new Set(["tx-member"])),
    });

    const useCase = new ListTransactionsUseCase(
      transactionRepo,
      buildFakeMemberRepo(),
      buildFakeServiceRepo(),
      memberPaymentRepo,
    );

    const result = await useCase.execute({ orgId: "org-1", authId: "auth-1" });

    expect(memberPaymentRepo.findTransactionIdsWithPayment).toHaveBeenCalledWith(
      "org-1",
      ["tx-member", "tx-plain"],
    );
    expect(result.map((v) => v.isMemberPayment)).toEqual([true, false]);
  });

  it("não quebra e evita N+1 quando não há transações", async () => {
    const transactionRepo = buildFakeTransactionRepo({
      findAllByOrg: jest.fn().mockResolvedValue([]),
    });
    const memberRepo = buildFakeMemberRepo();
    const serviceRepo = buildFakeServiceRepo();

    const useCase = new ListTransactionsUseCase(
      transactionRepo,
      memberRepo,
      serviceRepo,
      buildFakeMemberPaymentRepo(),
    );

    const result = await useCase.execute({ orgId: "org-1", authId: "auth-1" });

    expect(serviceRepo.findServiceIdsByTransactionIds).toHaveBeenCalledWith(
      "org-1",
      [],
    );
    expect(result).toEqual([]);
  });

  it("mantém o filtro de não-owner (createdBy = userId) preservado", async () => {
    const transaction = buildTransaction();
    const transactionRepo = buildFakeTransactionRepo({
      findAllByOrg: jest.fn().mockResolvedValue([transaction]),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(
        MemberEntity.create({
          memberId: "member-2",
          orgId: "org-1",
          userId: "user-2",
          role: "employee",
          enabled: true,
          permissions: [],
          userName: "Member",
          userEmail: "member@example.com",
          joinedAt: new Date("2026-01-01T00:00:00Z"),
        }),
      ),
    });
    const serviceRepo = buildFakeServiceRepo();

    const useCase = new ListTransactionsUseCase(
      transactionRepo,
      memberRepo,
      serviceRepo,
      buildFakeMemberPaymentRepo(),
    );

    await useCase.execute({ orgId: "org-1", authId: "auth-2" });

    expect(transactionRepo.findAllByOrg).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ createdBy: "user-2" }),
    );
  });
});
