import { CreateServiceTypeUseCase } from "./create-service-type.use-case";
import { IServiceTypeRepository } from "../../domain/service-type.repository.interface";
import { ServiceTypeEntity } from "../../domain/service-type.entity";

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

describe("CreateServiceTypeUseCase", () => {
  it("repassa requiresAgeVerification para o repositório quando informado", async () => {
    const created = buildServiceType({ requiresAgeVerification: true });
    const repo = buildFakeRepo({
      create: jest.fn().mockResolvedValue(created),
    });
    const useCase = new CreateServiceTypeUseCase(repo);

    const result = await useCase.execute(
      "org-1",
      "Tatuagem",
      null,
      true,
    );

    expect(repo.create).toHaveBeenCalledWith("org-1", "Tatuagem", null, true);
    expect(result).toBe(created);
  });

  it("usa false como padrão quando requiresAgeVerification não é informado", async () => {
    const created = buildServiceType();
    const repo = buildFakeRepo({
      create: jest.fn().mockResolvedValue(created),
    });
    const useCase = new CreateServiceTypeUseCase(repo);

    const result = await useCase.execute("org-1", "Tatuagem");

    expect(repo.create).toHaveBeenCalledWith(
      "org-1",
      "Tatuagem",
      null,
      false,
    );
    expect(result).toBe(created);
  });
});
