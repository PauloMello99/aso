import { GetOverviewAnalyticsUseCase } from "./get-overview-analytics.use-case";
import { IMemberRepository } from "../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../organizations/domain/member.entity";
import { OrgForbiddenException } from "../../organizations/domain/exceptions/org-forbidden.exception";
import { ListTransactionsUseCase } from "../../cashier/application/use-cases/list-transactions.use-case";
import { ListServicesUseCase } from "../../services/application/use-cases/list-services.use-case";
import { ListCustomersUseCase } from "../../customers/application/use-cases/list-customers.use-case";
import { GetBalanceHistoryUseCase } from "../../cashier/application/use-cases/get-balance-history.use-case";
import { IServiceRepository } from "../../services/domain/service.repository.interface";
import { ITransactionRepository } from "../../cashier/domain/transaction.repository.interface";

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
    userName: "Alguém",
    userEmail: "alguem@example.com",
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeMemberRepo(
  overrides: Partial<jest.Mocked<IMemberRepository>> = {},
): jest.Mocked<IMemberRepository> {
  return {
    findAllByOrg: jest.fn(),
    upsert: jest.fn(),
    findByMemberId: jest.fn(),
    findByAuthId: jest.fn(),
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

function buildFakeServiceRepo(
  overrides: Partial<jest.Mocked<IServiceRepository>> = {},
): jest.Mocked<IServiceRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByOrg: jest.fn(),
    setPaymentTransaction: jest.fn(),
    existsByPaymentTransactionId: jest.fn(),
    findServiceIdsByTransactionIds: jest.fn(),
    markCanceled: jest.fn(),
    correctPayment: jest.fn(),
    update: jest.fn(),
    materialCostCentsByPeriod: jest.fn().mockResolvedValue(0),
    countAndRevenueByType: jest.fn().mockResolvedValue([]),
    countAndRevenueByProfessional: jest.fn().mockResolvedValue([]),
    commissionCentsByPeriod: jest.fn().mockResolvedValue(0),
    ...overrides,
  } as unknown as jest.Mocked<IServiceRepository>;
}

function buildFakeTransactionRepo(
  overrides: Partial<jest.Mocked<ITransactionRepository>> = {},
): jest.Mocked<ITransactionRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByOrg: jest.fn(),
    findReversalOf: jest.fn(),
    findReversedIds: jest.fn(),
    balance: jest.fn(),
    dailyBalanceHistory: jest.fn(),
    incomeByPaymentMethod: jest.fn().mockResolvedValue([]),
    incomeExpenseSeries: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as jest.Mocked<ITransactionRepository>;
}

describe("GetOverviewAnalyticsUseCase", () => {
  function buildUseCase(
    memberRepo: jest.Mocked<IMemberRepository>,
    serviceRepo: jest.Mocked<IServiceRepository>,
    transactionRepo: jest.Mocked<ITransactionRepository>,
  ) {
    const listTransactions = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ListTransactionsUseCase>;
    const listServices = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ListServicesUseCase>;
    const listCustomers = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ListCustomersUseCase>;
    const getBalanceHistory = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<GetBalanceHistoryUseCase>;

    const useCase = new GetOverviewAnalyticsUseCase(
      memberRepo,
      serviceRepo,
      transactionRepo,
      listTransactions,
      listServices,
      listCustomers,
      getBalanceHistory,
    );

    return {
      useCase,
      listTransactions,
      listServices,
      listCustomers,
      getBalanceHistory,
    };
  }

  const from = new Date("2026-07-01T00:00:00Z");
  const to = new Date("2026-07-31T23:59:59Z");

  it("employee: retorna commissionCents do próprio usuário, chamando o repositório com o userId do membro", async () => {
    const member = buildMember({ role: "employee", userId: "user-employee" });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(member),
    });
    const serviceRepo = buildFakeServiceRepo({
      commissionCentsByPeriod: jest
        .fn()
        .mockResolvedValueOnce(5000)
        .mockResolvedValueOnce(2000),
    });
    const transactionRepo = buildFakeTransactionRepo();
    const { useCase } = buildUseCase(memberRepo, serviceRepo, transactionRepo);

    const result = await useCase.execute("org-1", "auth-1", from, to);

    expect(serviceRepo.commissionCentsByPeriod).toHaveBeenCalledWith(
      "org-1",
      from,
      to,
      "user-employee",
    );
    expect(serviceRepo.commissionCentsByPeriod).toHaveBeenNthCalledWith(
      2,
      "org-1",
      expect.any(Date),
      expect.any(Date),
      "user-employee",
    );
    expect(result.commissionCents).toEqual({
      current: 5000,
      previous: 2000,
      deltaPercent: 150,
    });
  });

  it("employee: sem serviços no período retorna commissionCents 0 com delta coerente", async () => {
    const member = buildMember({ role: "employee", userId: "user-employee" });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(member),
    });
    const serviceRepo = buildFakeServiceRepo({
      commissionCentsByPeriod: jest.fn().mockResolvedValue(0),
    });
    const transactionRepo = buildFakeTransactionRepo();
    const { useCase } = buildUseCase(memberRepo, serviceRepo, transactionRepo);

    const result = await useCase.execute("org-1", "auth-1", from, to);

    expect(result.commissionCents).toEqual({
      current: 0,
      previous: 0,
      deltaPercent: 0,
    });
  });

  it("owner: agrega commissionCents da org inteira, sem filtro de usuário", async () => {
    const member = buildMember({ role: "owner" });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(member),
    });
    const serviceRepo = buildFakeServiceRepo({
      commissionCentsByPeriod: jest
        .fn()
        .mockResolvedValueOnce(9000)
        .mockResolvedValueOnce(3000),
      countAndRevenueByProfessional: jest.fn().mockResolvedValue([
        { name: "Fulano", count: 3, revenueCents: 30000, commissionCents: 4500 },
      ]),
    });
    const transactionRepo = buildFakeTransactionRepo();
    const { useCase } = buildUseCase(memberRepo, serviceRepo, transactionRepo);

    const result = await useCase.execute("org-1", "auth-1", from, to);

    expect(serviceRepo.commissionCentsByPeriod).toHaveBeenNthCalledWith(
      1,
      "org-1",
      from,
      to,
      null,
    );
    expect(serviceRepo.commissionCentsByPeriod).toHaveBeenNthCalledWith(
      2,
      "org-1",
      expect.any(Date),
      expect.any(Date),
      null,
    );
    expect(result.commissionCents).toEqual({
      current: 9000,
      previous: 3000,
      deltaPercent: 200,
    });
    expect(result.revenueByProfessional).toEqual([
      { name: "Fulano", count: 3, revenueCents: 30000, commissionCents: 4500 },
    ]);
  });

  it("lança OrgForbiddenException quando não há membership", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(null),
    });
    const serviceRepo = buildFakeServiceRepo();
    const transactionRepo = buildFakeTransactionRepo();
    const { useCase } = buildUseCase(memberRepo, serviceRepo, transactionRepo);

    await expect(
      useCase.execute("org-1", "auth-1", from, to),
    ).rejects.toBeInstanceOf(OrgForbiddenException);
  });
});
