import { UpdateServiceUseCase } from "./update-service.use-case";
import { IServiceRepository } from "../../domain/service.repository.interface";
import { ServiceEntity } from "../../domain/service.entity";
import { IServiceTypeRepository } from "../../domain/service-type.repository.interface";
import { ServiceTypeEntity } from "../../domain/service-type.entity";
import { ICustomerRepository } from "../../../customers/domain/customer.repository.interface";
import { CustomerEntity } from "../../../customers/domain/customer.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { ServiceNotFoundException } from "../../domain/exceptions/service-not-found.exception";
import { ServiceAlreadyCanceledException } from "../../domain/exceptions/service-already-canceled.exception";
import { ServiceForbiddenException } from "../../domain/exceptions/service-forbidden.exception";
import { ServicePerformedAtFutureException } from "../../domain/exceptions/service-performed-at-future.exception";
import { ServiceAgeVerificationRequiredException } from "../../domain/exceptions/service-age-verification-required.exception";

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

interface Fakes {
  serviceRepo: jest.Mocked<IServiceRepository>;
  serviceTypeRepo: jest.Mocked<IServiceTypeRepository>;
  customerRepo: jest.Mocked<ICustomerRepository>;
  memberRepo: jest.Mocked<IMemberRepository>;
}

function buildUseCase(overrides: Partial<Fakes> = {}) {
  const fakes: Fakes = {
    serviceRepo: buildFakeServiceRepo(),
    serviceTypeRepo: buildFakeServiceTypeRepo(),
    customerRepo: buildFakeCustomerRepo(),
    memberRepo: buildFakeMemberRepo(),
    ...overrides,
  };
  const useCase = new UpdateServiceUseCase(
    fakes.serviceRepo,
    fakes.serviceTypeRepo,
    fakes.customerRepo,
    fakes.memberRepo,
  );
  return { useCase, ...fakes };
}

const baseInput = {
  orgId: "org-1",
  serviceId: "service-1",
  authId: "auth-1",
};

describe("UpdateServiceUseCase", () => {
  it("lança ServicePerformedAtFutureException quando performedAt é futuro, sem chamar update", async () => {
    const existing = buildService();
    const { useCase, serviceRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest.fn().mockResolvedValue(existing),
      }),
    });
    const future = new Date(Date.now() + 60_000);

    await expect(
      useCase.execute({ ...baseInput, performedAt: future }),
    ).rejects.toBeInstanceOf(ServicePerformedAtFutureException);
    expect(serviceRepo.update).not.toHaveBeenCalled();
  });

  it("atualiza normalmente quando performedAt é passado", async () => {
    const existing = buildService();
    const updated = buildService({ description: "Atualizado" });
    const { useCase, serviceRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce(updated),
        update: jest.fn().mockResolvedValue(updated),
      }),
    });
    const past = new Date("2026-07-01T09:00:00Z");

    const result = await useCase.execute({
      ...baseInput,
      description: "Atualizado",
      performedAt: past,
    });

    expect(serviceRepo.update).toHaveBeenCalledWith(
      existing.id,
      expect.objectContaining({ description: "Atualizado", performedAt: past }),
    );
    expect(result).toBe(updated);
  });

  it("atualiza normalmente quando performedAt é omitido", async () => {
    const existing = buildService();
    const updated = buildService();
    const { useCase, serviceRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce(updated),
        update: jest.fn().mockResolvedValue(updated),
      }),
    });

    await useCase.execute({ ...baseInput });

    expect(serviceRepo.update).toHaveBeenCalled();
  });

  it("lança ServiceNotFoundException quando o serviço não existe", async () => {
    const { useCase } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(useCase.execute({ ...baseInput })).rejects.toBeInstanceOf(
      ServiceNotFoundException,
    );
  });

  it("lança ServiceAlreadyCanceledException quando o serviço já foi cancelado", async () => {
    const canceled = buildService({ canceledAt: new Date("2026-07-02T00:00:00Z") });
    const { useCase } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest.fn().mockResolvedValue(canceled),
      }),
    });

    await expect(useCase.execute({ ...baseInput })).rejects.toBeInstanceOf(
      ServiceAlreadyCanceledException,
    );
  });

  it("lança ServiceForbiddenException quando funcionário tenta editar serviço de outro", async () => {
    const existing = buildService({ performedBy: "user-2" });
    const { useCase } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest.fn().mockResolvedValue(existing),
      }),
      memberRepo: buildFakeMemberRepo({
        findByAuthId: jest
          .fn()
          .mockResolvedValue(buildMember({ role: "employee", userId: "user-1" })),
      }),
    });

    await expect(useCase.execute({ ...baseInput })).rejects.toBeInstanceOf(
      ServiceForbiddenException,
    );
  });

  it("lança ServiceAgeVerificationRequiredException ao trocar só o cliente para um menor, sem reenviar serviceTypeId (usa o existente)", async () => {
    const serviceType = buildServiceType({ requiresAgeVerification: true });
    const existing = buildService({ serviceTypeId: serviceType.id });
    const minor = buildCustomer({ birthDate: "2015-01-01" });
    const { useCase, serviceRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest.fn().mockResolvedValue(existing),
      }),
      serviceTypeRepo: buildFakeServiceTypeRepo({
        findById: jest.fn().mockResolvedValue(serviceType),
      }),
      customerRepo: buildFakeCustomerRepo({
        findById: jest.fn().mockResolvedValue(minor),
      }),
    });

    await expect(
      useCase.execute({ ...baseInput, customerId: minor.id }),
    ).rejects.toBeInstanceOf(ServiceAgeVerificationRequiredException);
    expect(serviceRepo.update).not.toHaveBeenCalled();
  });

  it("lança ServiceAgeVerificationRequiredException ao trocar só o tipo de serviço, mantendo o cliente existente (menor)", async () => {
    const minor = buildCustomer({ id: "customer-2", birthDate: "2015-01-01" });
    const existing = buildService({ customerId: minor.id });
    const serviceType = buildServiceType({ requiresAgeVerification: true });
    const { useCase, serviceRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest.fn().mockResolvedValue(existing),
      }),
      serviceTypeRepo: buildFakeServiceTypeRepo({
        findById: jest.fn().mockResolvedValue(serviceType),
      }),
      customerRepo: buildFakeCustomerRepo({
        findById: jest.fn().mockResolvedValue(minor),
      }),
    });

    await expect(
      useCase.execute({ ...baseInput, serviceTypeId: serviceType.id }),
    ).rejects.toBeInstanceOf(ServiceAgeVerificationRequiredException);
    expect(serviceRepo.update).not.toHaveBeenCalled();
  });

  it("permite editar normalmente quando o tipo efetivo não exige verificação de idade", async () => {
    const existing = buildService();
    const updated = buildService({ description: "Atualizado" });
    const { useCase, serviceRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce(updated),
        update: jest.fn().mockResolvedValue(updated),
      }),
    });

    const result = await useCase.execute({
      ...baseInput,
      description: "Atualizado",
    });

    expect(serviceRepo.update).toHaveBeenCalled();
    expect(result).toBe(updated);
  });
});
