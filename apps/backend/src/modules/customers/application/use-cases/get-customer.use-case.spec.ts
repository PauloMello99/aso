import { GetCustomerUseCase } from "./get-customer.use-case";
import { ICustomerRepository } from "../../domain/customer.repository.interface";
import { CustomerEntity } from "../../domain/customer.entity";
import { CustomerNotFoundException } from "../../domain/exceptions/customer-not-found.exception";

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
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ICustomerRepository>;
}

function buildUseCase(overrides: Partial<jest.Mocked<ICustomerRepository>> = {}) {
  const customerRepo = buildFakeCustomerRepo(overrides);
  const useCase = new GetCustomerUseCase(customerRepo);
  return { useCase, customerRepo };
}

describe("GetCustomerUseCase", () => {
  it("retorna a entity quando findById encontra o cliente", async () => {
    const existing = buildCustomer();
    const { useCase, customerRepo } = buildUseCase({
      findById: jest.fn().mockResolvedValue(existing),
    });

    const result = await useCase.execute("customer-1", "org-1");

    expect(customerRepo.findById).toHaveBeenCalledWith("customer-1", "org-1");
    expect(result).toBe(existing);
  });

  it("lança CustomerNotFoundException quando findById retorna null", async () => {
    const { useCase } = buildUseCase({
      findById: jest.fn().mockResolvedValue(null),
    });

    await expect(useCase.execute("customer-1", "org-1")).rejects.toBeInstanceOf(
      CustomerNotFoundException,
    );
  });
});
