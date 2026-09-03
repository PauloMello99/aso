import { ListTransactionsPageUseCase } from "./list-transactions-page.use-case";
import { ITransactionRepository } from "../../domain/transaction.repository.interface";
import { TransactionEntity } from "../../domain/transaction.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { IServiceRepository } from "../../../services/domain/service.repository.interface";

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
    findAllByOrg: jest.fn(),
    findPageByOrg: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    findReversalOf: jest.fn(),
    findReversedIds: jest.fn(),
    findReversedIdsIn: jest.fn().mockResolvedValue(new Set()),
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

describe("ListTransactionsPageUseCase", () => {
  it("usa page=1 e limit=50 por padrão quando nenhum é informado", async () => {
    const transactionRepo = buildFakeTransactionRepo();
    const memberRepo = buildFakeMemberRepo();
    const serviceRepo = buildFakeServiceRepo();

    const useCase = new ListTransactionsPageUseCase(
      transactionRepo,
      memberRepo,
      serviceRepo,
    );

    const result = await useCase.execute({ orgId: "org-1", authId: "auth-1" });

    expect(transactionRepo.findPageByOrg).toHaveBeenCalledWith(
      "org-1",
      expect.any(Object),
      { limit: 50, offset: 0 },
    );
    expect(result).toEqual({ data: [], total: 0, page: 1, pages: 0 });
  });

  it("clampa limit acima do máximo para 200", async () => {
    const transactionRepo = buildFakeTransactionRepo();
    const memberRepo = buildFakeMemberRepo();
    const serviceRepo = buildFakeServiceRepo();

    const useCase = new ListTransactionsPageUseCase(
      transactionRepo,
      memberRepo,
      serviceRepo,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-1",
      limit: 500,
    });

    expect(transactionRepo.findPageByOrg).toHaveBeenCalledWith(
      "org-1",
      expect.any(Object),
      { limit: 200, offset: 0 },
    );
  });

  it("trata page=0 ou negativo como 1", async () => {
    const transactionRepo = buildFakeTransactionRepo();
    const memberRepo = buildFakeMemberRepo();
    const serviceRepo = buildFakeServiceRepo();

    const useCase = new ListTransactionsPageUseCase(
      transactionRepo,
      memberRepo,
      serviceRepo,
    );

    await useCase.execute({ orgId: "org-1", authId: "auth-1", page: 0 });
    await useCase.execute({ orgId: "org-1", authId: "auth-1", page: -3 });

    expect(transactionRepo.findPageByOrg).toHaveBeenNthCalledWith(
      1,
      "org-1",
      expect.any(Object),
      { limit: 50, offset: 0 },
    );
    expect(transactionRepo.findPageByOrg).toHaveBeenNthCalledWith(
      2,
      "org-1",
      expect.any(Object),
      { limit: 50, offset: 0 },
    );
  });

  it("força filter.createdBy para ator não-owner", async () => {
    const transactionRepo = buildFakeTransactionRepo();
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

    const useCase = new ListTransactionsPageUseCase(
      transactionRepo,
      memberRepo,
      serviceRepo,
    );

    await useCase.execute({ orgId: "org-1", authId: "auth-2" });

    expect(transactionRepo.findPageByOrg).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ createdBy: "user-2" }),
      { limit: 50, offset: 0 },
    );
  });

  it("calcula pages corretamente (Math.ceil(total/limit)) e 0 quando total=0", async () => {
    const transaction = buildTransaction();
    const transactionRepo = buildFakeTransactionRepo({
      findPageByOrg: jest
        .fn()
        .mockResolvedValue({ rows: [transaction], total: 101 }),
    });
    const memberRepo = buildFakeMemberRepo();
    const serviceRepo = buildFakeServiceRepo();

    const useCase = new ListTransactionsPageUseCase(
      transactionRepo,
      memberRepo,
      serviceRepo,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      authId: "auth-1",
      limit: 50,
    });

    expect(result.total).toBe(101);
    expect(result.pages).toBe(3);

    const emptyRepo = buildFakeTransactionRepo({
      findPageByOrg: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    });
    const emptyUseCase = new ListTransactionsPageUseCase(
      emptyRepo,
      memberRepo,
      serviceRepo,
    );

    const emptyResult = await emptyUseCase.execute({
      orgId: "org-1",
      authId: "auth-1",
    });

    expect(emptyResult.pages).toBe(0);
  });

  it("chama findReversedIdsIn e findServiceIdsByTransactionIds só com os ids da página", async () => {
    const transactionA = buildTransaction({ id: "tx-a" });
    const transactionB = buildTransaction({ id: "tx-b" });
    const transactionRepo = buildFakeTransactionRepo({
      findPageByOrg: jest.fn().mockResolvedValue({
        rows: [transactionA, transactionB],
        total: 50,
      }),
      findReversedIdsIn: jest.fn().mockResolvedValue(new Set(["tx-a"])),
    });
    const memberRepo = buildFakeMemberRepo();
    const serviceRepo = buildFakeServiceRepo({
      findServiceIdsByTransactionIds: jest
        .fn()
        .mockResolvedValue(new Map([["tx-b", "service-1"]])),
    });

    const useCase = new ListTransactionsPageUseCase(
      transactionRepo,
      memberRepo,
      serviceRepo,
    );

    const result = await useCase.execute({ orgId: "org-1", authId: "auth-1" });

    expect(transactionRepo.findReversedIdsIn).toHaveBeenCalledWith("org-1", [
      "tx-a",
      "tx-b",
    ]);
    expect(serviceRepo.findServiceIdsByTransactionIds).toHaveBeenCalledWith(
      "org-1",
      ["tx-a", "tx-b"],
    );
    expect(result.data).toEqual([
      { entity: transactionA, reversed: true, serviceId: null },
      { entity: transactionB, reversed: false, serviceId: "service-1" },
    ]);
  });

  it("não quebra com lista vazia de transações na página", async () => {
    const transactionRepo = buildFakeTransactionRepo({
      findPageByOrg: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    });
    const memberRepo = buildFakeMemberRepo();
    const serviceRepo = buildFakeServiceRepo();

    const useCase = new ListTransactionsPageUseCase(
      transactionRepo,
      memberRepo,
      serviceRepo,
    );

    const result = await useCase.execute({ orgId: "org-1", authId: "auth-1" });

    expect(transactionRepo.findReversedIdsIn).toHaveBeenCalledWith("org-1", []);
    expect(serviceRepo.findServiceIdsByTransactionIds).toHaveBeenCalledWith(
      "org-1",
      [],
    );
    expect(result).toEqual({ data: [], total: 0, page: 1, pages: 0 });
  });
});
