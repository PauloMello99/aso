import { GetOverviewUseCase } from "./get-overview.use-case";
import { IMemberRepository } from "../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../organizations/domain/member.entity";
import { OrgForbiddenException } from "../../organizations/domain/exceptions/org-forbidden.exception";
import { ListServicesUseCase } from "../../services/application/use-cases/list-services.use-case";
import { ListTransactionsUseCase } from "../../cashier/application/use-cases/list-transactions.use-case";
import { ListTransactionCategoriesUseCase } from "../../cashier/application/use-cases/list-transaction-categories.use-case";
import { ListMaterialsUseCase } from "../../materials/application/use-cases/list-materials.use-case";
import { ListCalendarEventsUseCase } from "../../calendar/application/use-cases/list-calendar-events.use-case";
import { ListCustomersUseCase } from "../../customers/application/use-cases/list-customers.use-case";

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

function fakeUseCase(resolvedValue: unknown[]): { execute: jest.Mock } {
  return { execute: jest.fn().mockResolvedValue(resolvedValue) };
}

describe("GetOverviewUseCase", () => {
  function buildUseCase(memberRepo: jest.Mocked<IMemberRepository>) {
    const listServices = fakeUseCase([]) as unknown as jest.Mocked<ListServicesUseCase>;
    const listTransactions = fakeUseCase(
      [],
    ) as unknown as jest.Mocked<ListTransactionsUseCase>;
    const listCategories = fakeUseCase(
      [],
    ) as unknown as jest.Mocked<ListTransactionCategoriesUseCase>;
    const listMaterials = fakeUseCase(
      [],
    ) as unknown as jest.Mocked<ListMaterialsUseCase>;
    const listEvents = fakeUseCase(
      [],
    ) as unknown as jest.Mocked<ListCalendarEventsUseCase>;
    const listCustomers = fakeUseCase(
      [],
    ) as unknown as jest.Mocked<ListCustomersUseCase>;

    const useCase = new GetOverviewUseCase(
      memberRepo,
      listServices,
      listTransactions,
      listCategories,
      listMaterials,
      listEvents,
      listCustomers,
    );

    return {
      useCase,
      listServices,
      listTransactions,
      listCategories,
      listMaterials,
      listEvents,
      listCustomers,
    };
  }

  it("owner: chama os 6 use-cases e retorna as 6 chaves", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember({ role: "owner" })),
    });
    const {
      useCase,
      listServices,
      listTransactions,
      listCategories,
      listMaterials,
      listEvents,
      listCustomers,
    } = buildUseCase(memberRepo);

    const result = await useCase.execute("org-1", "auth-1");

    expect(listServices.execute).toHaveBeenCalledTimes(1);
    expect(listEvents.execute).toHaveBeenCalledTimes(1);
    expect(listMaterials.execute).toHaveBeenCalledTimes(1);
    expect(listTransactions.execute).toHaveBeenCalledTimes(1);
    expect(listCategories.execute).toHaveBeenCalledTimes(1);
    expect(listCustomers.execute).toHaveBeenCalledTimes(1);

    expect(result).toEqual(
      expect.objectContaining({
        recentServices: [],
        upcomingEvents: [],
        lowStock: [],
        recentTransactions: [],
        transactionCategories: [],
        recentCustomers: [],
      }),
    );
  });

  it("employee com permissions=['services','schedule']: só busca serviços e agenda", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(
        buildMember({ role: "employee", permissions: ["services", "schedule"] }),
      ),
    });
    const {
      useCase,
      listServices,
      listTransactions,
      listCategories,
      listMaterials,
      listEvents,
      listCustomers,
    } = buildUseCase(memberRepo);

    const result = await useCase.execute("org-1", "auth-1");

    expect(listServices.execute).toHaveBeenCalledTimes(1);
    expect(listEvents.execute).toHaveBeenCalledTimes(1);
    expect(listMaterials.execute).not.toHaveBeenCalled();
    expect(listTransactions.execute).not.toHaveBeenCalled();
    expect(listCategories.execute).not.toHaveBeenCalled();
    expect(listCustomers.execute).not.toHaveBeenCalled();

    expect("recentServices" in result).toBe(true);
    expect("upcomingEvents" in result).toBe(true);
    expect("lowStock" in result).toBe(false);
    expect("recentTransactions" in result).toBe(false);
    expect("transactionCategories" in result).toBe(false);
    expect("recentCustomers" in result).toBe(false);
  });

  it("employee com permissions=['stock']: só busca estoque", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(
        buildMember({ role: "employee", permissions: ["stock"] }),
      ),
    });
    const {
      useCase,
      listServices,
      listTransactions,
      listCategories,
      listMaterials,
      listEvents,
      listCustomers,
    } = buildUseCase(memberRepo);

    const result = await useCase.execute("org-1", "auth-1");

    expect(listMaterials.execute).toHaveBeenCalledTimes(1);
    expect(listServices.execute).not.toHaveBeenCalled();
    expect(listEvents.execute).not.toHaveBeenCalled();
    expect(listTransactions.execute).not.toHaveBeenCalled();
    expect(listCategories.execute).not.toHaveBeenCalled();
    expect(listCustomers.execute).not.toHaveBeenCalled();

    expect("lowStock" in result).toBe(true);
    expect("recentServices" in result).toBe(false);
    expect("upcomingEvents" in result).toBe(false);
    expect("recentTransactions" in result).toBe(false);
    expect("transactionCategories" in result).toBe(false);
    expect("recentCustomers" in result).toBe(false);
  });

  it("employee com permissions=[]: nenhuma chave, nenhum use-case chamado, sem throw", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(
        buildMember({ role: "employee", permissions: [] }),
      ),
    });
    const {
      useCase,
      listServices,
      listTransactions,
      listCategories,
      listMaterials,
      listEvents,
      listCustomers,
    } = buildUseCase(memberRepo);

    const result = await useCase.execute("org-1", "auth-1");

    expect(listServices.execute).not.toHaveBeenCalled();
    expect(listEvents.execute).not.toHaveBeenCalled();
    expect(listMaterials.execute).not.toHaveBeenCalled();
    expect(listTransactions.execute).not.toHaveBeenCalled();
    expect(listCategories.execute).not.toHaveBeenCalled();
    expect(listCustomers.execute).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it("lança OrgForbiddenException quando não há membership", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(null),
    });
    const { useCase } = buildUseCase(memberRepo);

    await expect(useCase.execute("org-1", "auth-1")).rejects.toBeInstanceOf(
      OrgForbiddenException,
    );
  });
});
