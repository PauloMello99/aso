import { CreateServiceUseCase } from "./create-service.use-case";
import { IServiceRepository } from "../../domain/service.repository.interface";
import { ServiceEntity } from "../../domain/service.entity";
import { IServiceTypeRepository } from "../../domain/service-type.repository.interface";
import { ServiceTypeEntity } from "../../domain/service-type.entity";
import { ICustomerRepository } from "../../../customers/domain/customer.repository.interface";
import { CustomerEntity } from "../../../customers/domain/customer.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { IMaterialRepository } from "../../../materials/domain/material.repository.interface";
import { MaterialEntity } from "../../../materials/domain/material.entity";
import { IStockMovementRepository } from "../../../materials/domain/stock-movement.repository.interface";
import { ITransactionRepository } from "../../../cashier/domain/transaction.repository.interface";
import { IPaymentFeeRepository } from "../../../cashier/domain/payment-fee.repository.interface";
import { ServiceMaterialRequiredException } from "../../domain/exceptions/service-material-required.exception";
import { ServicePerformedAtFutureException } from "../../domain/exceptions/service-performed-at-future.exception";
import { ServiceAgeVerificationRequiredException } from "../../domain/exceptions/service-age-verification-required.exception";
import { InsufficientStockException } from "../../../materials/domain/exceptions/insufficient-stock.exception";

function buildService(
  overrides: Partial<Parameters<typeof ServiceEntity.create>[0]> = {},
): ServiceEntity {
  return ServiceEntity.create({
    id: "service-1",
    orgId: "org-1",
    serviceTypeId: null,
    customerId: null,
    paymentTransactionId: null,
    performedBy: "user-1",
    createdBy: "user-1",
    description: null,
    amountCents: 10000,
    paymentMethod: "cash",
    performedAt: new Date("2026-07-01T10:00:00Z"),
    canceledAt: null,
    createdAt: new Date("2026-07-01T10:00:00Z"),
    updatedAt: new Date("2026-07-01T10:00:00Z"),
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
    role: "owner",
    enabled: true,
    permissions: [],
    userName: "Owner",
    userEmail: "owner@example.com",
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildMaterial(
  overrides: Partial<Parameters<typeof MaterialEntity.create>[0]> = {},
): MaterialEntity {
  return MaterialEntity.create({
    id: "material-1",
    orgId: "org-1",
    categoryId: null,
    name: "Tinta",
    stockQuantity: "10",
    minimumQuantity: "1",
    costPerUnit: null,
    shareable: false,
    lastUsedAt: null,
    archivedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildServiceType(
  overrides: Partial<Parameters<typeof ServiceTypeEntity.create>[0]> = {},
): ServiceTypeEntity {
  return ServiceTypeEntity.create({
    id: "service-type-1",
    orgId: "org-1",
    name: "Tatuagem",
    description: null,
    requiresAgeVerification: false,
    ...overrides,
  });
}

function buildCustomer(
  overrides: Partial<Parameters<typeof CustomerEntity.create>[0]> = {},
): CustomerEntity {
  return CustomerEntity.create({
    id: "customer-1",
    orgId: "org-1",
    userId: null,
    originId: null,
    createdBy: null,
    name: "Cliente",
    email: "cliente@example.com",
    phone: null,
    birthDate: "2000-01-01",
    gender: null,
    address: "Rua A",
    number: "1",
    addressLine2: null,
    city: "Cidade",
    state: "SP",
    postalCode: null,
    country: null,
    notes: null,
    enabled: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeServiceTypeRepo(
  overrides: Partial<jest.Mocked<IServiceTypeRepository>> = {},
): jest.Mocked<IServiceTypeRepository> {
  return {
    findByOrg: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IServiceTypeRepository>;
}

function buildFakeServiceRepo(
  overrides: Partial<jest.Mocked<IServiceRepository>> = {},
): jest.Mocked<IServiceRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByOrg: jest.fn(),
    setPaymentTransaction: jest.fn(),
    markCanceled: jest.fn(),
    update: jest.fn(),
    materialCostCentsByPeriod: jest.fn(),
    countAndRevenueByType: jest.fn(),
    countAndRevenueByProfessional: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IServiceRepository>;
}

function buildFakeCustomerRepo(
  overrides: Partial<jest.Mocked<ICustomerRepository>> = {},
): jest.Mocked<ICustomerRepository> {
  return {
    findById: jest.fn(),
    findAllByOrg: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ICustomerRepository>;
}

function buildFakeMemberRepo(
  overrides: Partial<jest.Mocked<IMemberRepository>> = {},
): jest.Mocked<IMemberRepository> {
  return {
    findAllByOrg: jest.fn(),
    upsert: jest.fn(),
    findByMemberId: jest.fn(),
    findByAuthId: jest.fn().mockResolvedValue(buildMember()),
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

function buildFakeMaterialRepo(
  overrides: Partial<jest.Mocked<IMaterialRepository>> = {},
): jest.Mocked<IMaterialRepository> {
  return {
    findById: jest.fn(),
    findAllByOrg: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStockQuantity: jest.fn(),
    touchLastUsed: jest.fn(),
    setArchived: jest.fn(),
    isLinkedToService: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMaterialRepository>;
}

function buildFakeMovementRepo(
  overrides: Partial<jest.Mocked<IStockMovementRepository>> = {},
): jest.Mocked<IStockMovementRepository> {
  return {
    findAllByMaterial: jest.fn(),
    create: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IStockMovementRepository>;
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
    findByOrgAndMethod: jest.fn(),
    upsert: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IPaymentFeeRepository>;
}

interface Fakes {
  serviceRepo: jest.Mocked<IServiceRepository>;
  serviceTypeRepo: jest.Mocked<IServiceTypeRepository>;
  customerRepo: jest.Mocked<ICustomerRepository>;
  memberRepo: jest.Mocked<IMemberRepository>;
  materialRepo: jest.Mocked<IMaterialRepository>;
  movementRepo: jest.Mocked<IStockMovementRepository>;
  transactionRepo: jest.Mocked<ITransactionRepository>;
  feeRepo: jest.Mocked<IPaymentFeeRepository>;
}

function buildUseCase(overrides: Partial<Fakes> = {}) {
  const fakes: Fakes = {
    serviceRepo: buildFakeServiceRepo(),
    serviceTypeRepo: buildFakeServiceTypeRepo(),
    customerRepo: buildFakeCustomerRepo(),
    memberRepo: buildFakeMemberRepo(),
    materialRepo: buildFakeMaterialRepo(),
    movementRepo: buildFakeMovementRepo(),
    transactionRepo: buildFakeTransactionRepo(),
    feeRepo: buildFakeFeeRepo(),
    ...overrides,
  };
  const useCase = new CreateServiceUseCase(
    fakes.serviceRepo,
    fakes.serviceTypeRepo,
    fakes.customerRepo,
    fakes.memberRepo,
    fakes.materialRepo,
    fakes.movementRepo,
    fakes.transactionRepo,
    fakes.feeRepo,
  );
  return { useCase, ...fakes };
}

const baseInput = {
  orgId: "org-1",
  authId: "auth-1",
  amountCents: 10000,
  paymentMethod: "cash" as const,
  paymentStatus: "pending" as const,
};

describe("CreateServiceUseCase", () => {
  it("lança ServiceMaterialRequiredException quando nenhuma linha resulta em consumo real", async () => {
    const material = buildMaterial({ shareable: true });
    const { useCase, serviceRepo, materialRepo } = buildUseCase({
      materialRepo: buildFakeMaterialRepo({
        findById: jest.fn().mockResolvedValue(material),
      }),
    });

    await expect(
      useCase.execute({
        ...baseInput,
        materials: [{ materialId: material.id, finished: false }],
      }),
    ).rejects.toBeInstanceOf(ServiceMaterialRequiredException);
    expect(serviceRepo.create).not.toHaveBeenCalled();
    expect(materialRepo.findById).toHaveBeenCalled();
  });

  it("não lança e cria o serviço quando ao menos uma linha consome material de verdade", async () => {
    const material = buildMaterial({ shareable: false, stockQuantity: "10" });
    const created = buildService();
    const { useCase, serviceRepo, movementRepo } = buildUseCase({
      materialRepo: buildFakeMaterialRepo({
        findById: jest.fn().mockResolvedValue(material),
      }),
      serviceRepo: buildFakeServiceRepo({
        create: jest.fn().mockResolvedValue(created),
        findById: jest.fn().mockResolvedValue(created),
      }),
    });

    const result = await useCase.execute({
      ...baseInput,
      materials: [{ materialId: material.id, quantity: 2 }],
    });

    expect(serviceRepo.create).toHaveBeenCalledWith(
      expect.any(Object),
      expect.arrayContaining([
        expect.objectContaining({ materialId: material.id, quantity: "2" }),
      ]),
    );
    expect(movementRepo.create).toHaveBeenCalled();
    expect(result).toBe(created);
  });

  it("lança ServicePerformedAtFutureException quando performedAt está no futuro, sem tocar repositório de material", async () => {
    const { useCase, materialRepo } = buildUseCase();
    const future = new Date(Date.now() + 60_000);

    await expect(
      useCase.execute({
        ...baseInput,
        performedAt: future,
        materials: [{ materialId: "material-1", quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(ServicePerformedAtFutureException);
    expect(materialRepo.findById).not.toHaveBeenCalled();
  });

  it("mantém o comportamento existente de InsufficientStockException", async () => {
    const material = buildMaterial({ shareable: false, stockQuantity: "1" });
    const { useCase } = buildUseCase({
      materialRepo: buildFakeMaterialRepo({
        findById: jest.fn().mockResolvedValue(material),
      }),
    });

    await expect(
      useCase.execute({
        ...baseInput,
        materials: [{ materialId: material.id, quantity: 5 }],
      }),
    ).rejects.toBeInstanceOf(InsufficientStockException);
  });

  it("lança ServiceAgeVerificationRequiredException quando o tipo exige maioridade e não há cliente selecionado", async () => {
    const serviceType = buildServiceType({ requiresAgeVerification: true });
    const { useCase, materialRepo, serviceRepo } = buildUseCase({
      serviceTypeRepo: buildFakeServiceTypeRepo({
        findById: jest.fn().mockResolvedValue(serviceType),
      }),
    });

    await expect(
      useCase.execute({
        ...baseInput,
        serviceTypeId: serviceType.id,
        materials: [{ materialId: "material-1", quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(ServiceAgeVerificationRequiredException);
    expect(materialRepo.findById).not.toHaveBeenCalled();
    expect(serviceRepo.create).not.toHaveBeenCalled();
  });

  it("lança ServiceAgeVerificationRequiredException quando o cliente é menor de idade na data do atendimento", async () => {
    const serviceType = buildServiceType({ requiresAgeVerification: true });
    const minor = buildCustomer({ birthDate: "2015-01-01" });
    const { useCase } = buildUseCase({
      serviceTypeRepo: buildFakeServiceTypeRepo({
        findById: jest.fn().mockResolvedValue(serviceType),
      }),
      customerRepo: buildFakeCustomerRepo({
        findById: jest.fn().mockResolvedValue(minor),
      }),
    });

    await expect(
      useCase.execute({
        ...baseInput,
        customerId: minor.id,
        serviceTypeId: serviceType.id,
        performedAt: new Date("2026-07-01T10:00:00Z"),
        materials: [{ materialId: "material-1", quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(ServiceAgeVerificationRequiredException);
  });

  it("permite no dia exato em que o cliente completa 18 anos (limite mês/dia, não só ano)", async () => {
    const serviceType = buildServiceType({ requiresAgeVerification: true });
    // Aniversário de 18 anos é em 2026-07-02.
    const adult = buildCustomer({ birthDate: "2008-07-02" });
    const material = buildMaterial({ shareable: false, stockQuantity: "10" });
    const created = buildService();
    const { useCase } = buildUseCase({
      serviceTypeRepo: buildFakeServiceTypeRepo({
        findById: jest.fn().mockResolvedValue(serviceType),
      }),
      customerRepo: buildFakeCustomerRepo({
        findById: jest.fn().mockResolvedValue(adult),
      }),
      materialRepo: buildFakeMaterialRepo({
        findById: jest.fn().mockResolvedValue(material),
      }),
      serviceRepo: buildFakeServiceRepo({
        create: jest.fn().mockResolvedValue(created),
        findById: jest.fn().mockResolvedValue(created),
      }),
    });

    const result = await useCase.execute({
      ...baseInput,
      customerId: adult.id,
      serviceTypeId: serviceType.id,
      performedAt: new Date("2026-07-02T10:00:00Z"),
      materials: [{ materialId: material.id, quantity: 2 }],
    });

    expect(result).toBe(created);
  });

  it("bloqueia no dia anterior ao 18º aniversário (ainda 17, não é só subtração de anos)", async () => {
    const serviceType = buildServiceType({ requiresAgeVerification: true });
    // Aniversário de 18 anos é em 2026-07-02; véspera ainda é 17.
    const almostAdult = buildCustomer({ birthDate: "2008-07-02" });
    const { useCase } = buildUseCase({
      serviceTypeRepo: buildFakeServiceTypeRepo({
        findById: jest.fn().mockResolvedValue(serviceType),
      }),
      customerRepo: buildFakeCustomerRepo({
        findById: jest.fn().mockResolvedValue(almostAdult),
      }),
    });

    await expect(
      useCase.execute({
        ...baseInput,
        customerId: almostAdult.id,
        serviceTypeId: serviceType.id,
        performedAt: new Date("2026-07-01T10:00:00Z"),
        materials: [{ materialId: "material-1", quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(ServiceAgeVerificationRequiredException);
  });
});
