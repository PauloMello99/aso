import { ListCustomersPageUseCase } from "./list-customers-page.use-case";
import { ICustomerRepository } from "../../domain/customer.repository.interface";
import { CustomerEntity } from "../../domain/customer.entity";

function buildCustomer(
  overrides: Partial<Parameters<typeof CustomerEntity.create>[0]> = {},
): CustomerEntity {
  return CustomerEntity.create({
    id: "customer-1",
    orgId: "org-1",
    userId: null,
    originId: null,
    createdBy: "user-1",
    name: "Cliente",
    email: "cliente@example.com",
    phone: null,
    birthDate: "1990-01-01",
    gender: null,
    address: "Rua Teste",
    number: "100",
    addressLine2: null,
    city: "São Paulo",
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

function buildFakeCustomerRepo(
  overrides: Partial<jest.Mocked<ICustomerRepository>> = {},
): jest.Mocked<ICustomerRepository> {
  return {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findAllByOrg: jest.fn(),
    findPageByOrg: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    findOptionsByOrg: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ICustomerRepository>;
}

describe("ListCustomersPageUseCase", () => {
  it("usa page=1 e limit=50 por padrão quando nenhum é informado", async () => {
    const customerRepo = buildFakeCustomerRepo();
    const useCase = new ListCustomersPageUseCase(customerRepo);

    const result = await useCase.execute("org-1");

    expect(customerRepo.findPageByOrg).toHaveBeenCalledWith(
      "org-1",
      undefined,
      { limit: 50, offset: 0 },
    );
    expect(result).toEqual({ data: [], total: 0, page: 1, pages: 0 });
  });

  it("clampa limit acima do máximo para 200", async () => {
    const customerRepo = buildFakeCustomerRepo();
    const useCase = new ListCustomersPageUseCase(customerRepo);

    await useCase.execute("org-1", undefined, 1, 500);

    expect(customerRepo.findPageByOrg).toHaveBeenCalledWith(
      "org-1",
      undefined,
      { limit: 200, offset: 0 },
    );
  });

  it("trata page=0 ou negativo como 1", async () => {
    const customerRepo = buildFakeCustomerRepo();
    const useCase = new ListCustomersPageUseCase(customerRepo);

    await useCase.execute("org-1", undefined, 0);
    await useCase.execute("org-1", undefined, -3);

    expect(customerRepo.findPageByOrg).toHaveBeenNthCalledWith(
      1,
      "org-1",
      undefined,
      { limit: 50, offset: 0 },
    );
    expect(customerRepo.findPageByOrg).toHaveBeenNthCalledWith(
      2,
      "org-1",
      undefined,
      { limit: 50, offset: 0 },
    );
  });

  it("repassa todos os filtros de ListCustomersFilter ao repositório sem alteração", async () => {
    const customerRepo = buildFakeCustomerRepo();
    const useCase = new ListCustomersPageUseCase(customerRepo);

    const filter = {
      search: "maria",
      status: "active" as const,
      enabledOnly: true,
      originId: "origin-1",
      gender: "female" as const,
      from: new Date("2026-01-01T00:00:00Z"),
      to: new Date("2026-02-01T00:00:00Z"),
      birthMonth: 5,
      city: "São Paulo",
      state: "SP",
    };

    await useCase.execute("org-1", filter);

    expect(customerRepo.findPageByOrg).toHaveBeenCalledWith(
      "org-1",
      filter,
      { limit: 50, offset: 0 },
    );
  });

  it("calcula pages corretamente (Math.ceil(total/limit)) e 0 quando total=0", async () => {
    const customer = buildCustomer();
    const customerRepo = buildFakeCustomerRepo({
      findPageByOrg: jest
        .fn()
        .mockResolvedValue({ rows: [customer], total: 101 }),
    });
    const useCase = new ListCustomersPageUseCase(customerRepo);

    const result = await useCase.execute("org-1", undefined, 1, 50);

    expect(result.total).toBe(101);
    expect(result.pages).toBe(3);

    const emptyRepo = buildFakeCustomerRepo({
      findPageByOrg: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    });
    const emptyUseCase = new ListCustomersPageUseCase(emptyRepo);

    const emptyResult = await emptyUseCase.execute("org-1");

    expect(emptyResult.pages).toBe(0);
  });
});
