import { ListCustomerOptionsUseCase } from "./list-customer-options.use-case";
import { ICustomerRepository } from "../../domain/customer.repository.interface";

const MAX_OPTIONS = 1000;

function buildFakeCustomerRepo(
  overrides: Partial<jest.Mocked<ICustomerRepository>> = {},
): jest.Mocked<ICustomerRepository> {
  return {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findAllByOrg: jest.fn(),
    findPageByOrg: jest.fn(),
    findOptionsByOrg: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ICustomerRepository>;
}

function buildOptions(count: number): { id: string; name: string }[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `customer-${i}`,
    name: `Cliente ${i}`,
  }));
}

describe("ListCustomerOptionsUseCase", () => {
  it("corta para MAX_OPTIONS e marca truncated=true quando o repo retorna MAX_OPTIONS+1", async () => {
    const rows = buildOptions(MAX_OPTIONS + 1);
    const customerRepo = buildFakeCustomerRepo({
      findOptionsByOrg: jest.fn().mockResolvedValue(rows),
    });
    const useCase = new ListCustomerOptionsUseCase(customerRepo);

    const result = await useCase.execute("org-1");

    expect(result.data).toHaveLength(MAX_OPTIONS);
    expect(result.truncated).toBe(true);
    expect(result.data).toEqual(rows.slice(0, MAX_OPTIONS));
  });

  it("não corta e marca truncated=false quando o repo retorna MAX_OPTIONS ou menos", async () => {
    const rows = buildOptions(MAX_OPTIONS);
    const customerRepo = buildFakeCustomerRepo({
      findOptionsByOrg: jest.fn().mockResolvedValue(rows),
    });
    const useCase = new ListCustomerOptionsUseCase(customerRepo);

    const result = await useCase.execute("org-1");

    expect(result.data).toHaveLength(MAX_OPTIONS);
    expect(result.data).toEqual(rows);
    expect(result.truncated).toBe(false);

    const fewRows = buildOptions(10);
    const fewRepo = buildFakeCustomerRepo({
      findOptionsByOrg: jest.fn().mockResolvedValue(fewRows),
    });
    const fewUseCase = new ListCustomerOptionsUseCase(fewRepo);

    const fewResult = await fewUseCase.execute("org-1");

    expect(fewResult.data).toEqual(fewRows);
    expect(fewResult.truncated).toBe(false);
  });

  it("sempre chama findOptionsByOrg com { enabledOnly: true, limit: MAX_OPTIONS }", async () => {
    const customerRepo = buildFakeCustomerRepo();
    const useCase = new ListCustomerOptionsUseCase(customerRepo);

    await useCase.execute("org-1");

    expect(customerRepo.findOptionsByOrg).toHaveBeenCalledWith("org-1", {
      enabledOnly: true,
      limit: MAX_OPTIONS,
    });
  });
});
