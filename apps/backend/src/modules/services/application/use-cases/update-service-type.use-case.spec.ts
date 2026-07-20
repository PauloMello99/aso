import { UpdateServiceTypeUseCase } from "./update-service-type.use-case";
import { IServiceTypeRepository } from "../../domain/service-type.repository.interface";
import { ServiceTypeEntity } from "../../domain/service-type.entity";
import { ServiceTypeNotFoundException } from "../../domain/exceptions/service-type-not-found.exception";

function buildServiceType(
  overrides: Partial<Parameters<typeof ServiceTypeEntity.create>[0]> = {},
): ServiceTypeEntity {
  return ServiceTypeEntity.create({
    id: "type-1",
    orgId: "org-1",
    name: "Tatuagem",
    description: null,
    requiresAgeVerification: false,
    ...overrides,
  });
}

function buildFakeRepo(
  overrides: Partial<jest.Mocked<IServiceTypeRepository>> = {},
): jest.Mocked<IServiceTypeRepository> {
  return {
    findByOrg: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IServiceTypeRepository>;
}

describe("UpdateServiceTypeUseCase", () => {
  it("atualiza os campos enviados e retorna a entidade", async () => {
    const updated = buildServiceType({ requiresAgeVerification: true });
    const repo = buildFakeRepo({
      update: jest.fn().mockResolvedValue(updated),
    });
    const useCase = new UpdateServiceTypeUseCase(repo);

    const result = await useCase.execute("org-1", "type-1", {
      requiresAgeVerification: true,
    });

    expect(repo.update).toHaveBeenCalledWith("type-1", "org-1", {
      requiresAgeVerification: true,
    });
    expect(result).toBe(updated);
  });

  it("lança ServiceTypeNotFoundException quando o tipo não existe na org", async () => {
    const repo = buildFakeRepo({
      update: jest.fn().mockResolvedValue(null),
    });
    const useCase = new UpdateServiceTypeUseCase(repo);

    await expect(
      useCase.execute("org-1", "missing", { name: "Novo nome" }),
    ).rejects.toBeInstanceOf(ServiceTypeNotFoundException);
  });
});
