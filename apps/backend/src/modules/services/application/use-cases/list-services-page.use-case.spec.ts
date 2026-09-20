import { ListServicesPageUseCase } from "./list-services-page.use-case";
import { IServiceRepository } from "../../domain/service.repository.interface";
import { ServiceEntity } from "../../domain/service.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";

function buildFakeService(
  overrides: Partial<Parameters<typeof ServiceEntity.create>[0]> = {},
): ServiceEntity {
  return ServiceEntity.create({
    id: "service-1",
    orgId: "org-1",
    serviceTypeId: null,
    customerId: null,
    paymentTransactionId: null,
    anamnesisResponseId: null,
    performedBy: null,
    createdBy: "user-1",
    description: "Corte",
    amountCents: 5000,
    paymentMethod: "cash",
    commissionConfigId: null,
    commissionPercent: null,
    commissionMode: null,
    commissionBaseCents: 0,
    commissionCents: 0,
    performedAt: new Date("2026-07-01T10:00:00Z"),
    canceledAt: null,
    createdAt: new Date("2026-07-01T10:00:00Z"),
    updatedAt: new Date("2026-07-01T10:00:00Z"),
    ...overrides,
  });
}

function buildFakeServiceRepo(
  overrides: Partial<jest.Mocked<IServiceRepository>> = {},
): jest.Mocked<IServiceRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByOrg: jest.fn(),
    findPageByOrg: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    setPaymentTransaction: jest.fn(),
    existsByPaymentTransactionId: jest.fn(),
    findServiceIdsByTransactionIds: jest.fn().mockResolvedValue(new Map()),
    markCanceled: jest.fn(),
    correctPayment: jest.fn(),
    update: jest.fn(),
    materialCostCentsByPeriod: jest.fn(),
    countAndRevenueByType: jest.fn(),
    countAndRevenueByProfessional: jest.fn(),
    commissionCentsByPeriod: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IServiceRepository>;
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

describe("ListServicesPageUseCase", () => {
  it("usa page=1 e limit=50 por padrão quando nenhum é informado", async () => {
    const serviceRepo = buildFakeServiceRepo();
    const memberRepo = buildFakeMemberRepo();

    const useCase = new ListServicesPageUseCase(serviceRepo, memberRepo);

    const result = await useCase.execute({ orgId: "org-1", authId: "auth-1" });

    expect(serviceRepo.findPageByOrg).toHaveBeenCalledWith(
      "org-1",
      expect.any(Object),
      { limit: 50, offset: 0 },
    );
    expect(result).toEqual({ data: [], total: 0, page: 1, pages: 0 });
  });

  it("clampa limit acima do máximo para 200", async () => {
    const serviceRepo = buildFakeServiceRepo();
    const memberRepo = buildFakeMemberRepo();

    const useCase = new ListServicesPageUseCase(serviceRepo, memberRepo);

    await useCase.execute({ orgId: "org-1", authId: "auth-1", limit: 500 });

    expect(serviceRepo.findPageByOrg).toHaveBeenCalledWith(
      "org-1",
      expect.any(Object),
      { limit: 200, offset: 0 },
    );
  });

  it("trata page=0 ou negativo como 1", async () => {
    const serviceRepo = buildFakeServiceRepo();
    const memberRepo = buildFakeMemberRepo();

    const useCase = new ListServicesPageUseCase(serviceRepo, memberRepo);

    await useCase.execute({ orgId: "org-1", authId: "auth-1", page: 0 });
    await useCase.execute({ orgId: "org-1", authId: "auth-1", page: -3 });

    expect(serviceRepo.findPageByOrg).toHaveBeenNthCalledWith(
      1,
      "org-1",
      expect.any(Object),
      { limit: 50, offset: 0 },
    );
    expect(serviceRepo.findPageByOrg).toHaveBeenNthCalledWith(
      2,
      "org-1",
      expect.any(Object),
      { limit: 50, offset: 0 },
    );
  });

  it("força filter.performedBy para ator não-owner", async () => {
    const serviceRepo = buildFakeServiceRepo();
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

    const useCase = new ListServicesPageUseCase(serviceRepo, memberRepo);

    await useCase.execute({ orgId: "org-1", authId: "auth-2" });

    expect(serviceRepo.findPageByOrg).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ performedBy: "user-2" }),
      { limit: 50, offset: 0 },
    );
  });

  it("não força performedBy para owner, preservando o filtro original (mesmo undefined)", async () => {
    const serviceRepo = buildFakeServiceRepo();
    const memberRepo = buildFakeMemberRepo();

    const useCase = new ListServicesPageUseCase(serviceRepo, memberRepo);

    await useCase.execute({ orgId: "org-1", authId: "auth-1" });

    const [, filterArg] = serviceRepo.findPageByOrg.mock.calls[0];
    expect(filterArg).not.toHaveProperty("performedBy");
  });

  it("repassa q e demais filtros ao repositório sem alteração", async () => {
    const serviceRepo = buildFakeServiceRepo();
    const memberRepo = buildFakeMemberRepo();

    const useCase = new ListServicesPageUseCase(serviceRepo, memberRepo);

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-1",
      filter: { q: "corte", status: "paid", customerId: "customer-1" },
    });

    expect(serviceRepo.findPageByOrg).toHaveBeenCalledWith(
      "org-1",
      { q: "corte", status: "paid", customerId: "customer-1" },
      { limit: 50, offset: 0 },
    );
  });

  it("calcula pages corretamente (Math.ceil(total/limit)) e 0 quando total=0", async () => {
    const service = buildFakeService();
    const serviceRepo = buildFakeServiceRepo({
      findPageByOrg: jest
        .fn()
        .mockResolvedValue({ rows: [service], total: 101 }),
    });
    const memberRepo = buildFakeMemberRepo();

    const useCase = new ListServicesPageUseCase(serviceRepo, memberRepo);

    const result = await useCase.execute({
      orgId: "org-1",
      authId: "auth-1",
      limit: 50,
    });

    expect(result.total).toBe(101);
    expect(result.pages).toBe(3);

    const emptyRepo = buildFakeServiceRepo({
      findPageByOrg: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    });
    const emptyUseCase = new ListServicesPageUseCase(emptyRepo, memberRepo);

    const emptyResult = await emptyUseCase.execute({
      orgId: "org-1",
      authId: "auth-1",
    });

    expect(emptyResult.pages).toBe(0);
  });
});
