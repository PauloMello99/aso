import { UpdateCustomerUseCase } from "./update-customer.use-case";
import { ICustomerRepository } from "../../domain/customer.repository.interface";
import { CustomerEntity } from "../../domain/customer.entity";
import { CustomerNotFoundException } from "../../domain/exceptions/customer-not-found.exception";
import { CustomerEmailAlreadyExistsException } from "../../domain/exceptions/customer-email-already-exists.exception";

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
    findByEmail: jest.fn().mockResolvedValue(null),
    findAllByOrg: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ICustomerRepository>;
}

function buildUseCase(overrides: Partial<jest.Mocked<ICustomerRepository>> = {}) {
  const customerRepo = buildFakeCustomerRepo(overrides);
  const useCase = new UpdateCustomerUseCase(customerRepo);
  return { useCase, customerRepo };
}

describe("UpdateCustomerUseCase", () => {
  it("lança CustomerNotFoundException quando o cliente não existe", async () => {
    const { useCase } = buildUseCase({
      findById: jest.fn().mockResolvedValue(null),
    });

    await expect(
      useCase.execute("customer-1", "org-1", { name: "Novo nome" }),
    ).rejects.toBeInstanceOf(CustomerNotFoundException);
  });

  it("lança CustomerEmailAlreadyExistsException quando findByEmail (excludeId=id) retorna outro cliente", async () => {
    const existing = buildCustomer();
    const conflicting = buildCustomer({ id: "customer-2" });
    const { useCase, customerRepo } = buildUseCase({
      findById: jest.fn().mockResolvedValue(existing),
      findByEmail: jest.fn().mockResolvedValue(conflicting),
    });

    await expect(
      useCase.execute("customer-1", "org-1", {
        email: "outro@example.com",
      }),
    ).rejects.toBeInstanceOf(CustomerEmailAlreadyExistsException);
    expect(customerRepo.findByEmail).toHaveBeenCalledWith(
      "org-1",
      "outro@example.com",
      "customer-1",
    );
    expect(customerRepo.update).not.toHaveBeenCalled();
  });

  it("atualiza normalmente quando findByEmail retorna null", async () => {
    const existing = buildCustomer();
    const updated = buildCustomer({ email: "novo@example.com" });
    const { useCase, customerRepo } = buildUseCase({
      findById: jest.fn().mockResolvedValue(existing),
      findByEmail: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(updated),
    });

    const result = await useCase.execute("customer-1", "org-1", {
      email: "  novo@example.com  ",
    });

    expect(customerRepo.update).toHaveBeenCalledWith(
      "customer-1",
      expect.objectContaining({ email: "novo@example.com" }),
    );
    expect(result).toBe(updated);
  });

  it("atualiza normalmente quando email não é enviado", async () => {
    const existing = buildCustomer();
    const updated = buildCustomer({ name: "Atualizado" });
    const { useCase, customerRepo } = buildUseCase({
      findById: jest.fn().mockResolvedValue(existing),
      update: jest.fn().mockResolvedValue(updated),
    });

    const result = await useCase.execute("customer-1", "org-1", {
      name: "Atualizado",
    });

    expect(customerRepo.findByEmail).not.toHaveBeenCalled();
    expect(customerRepo.update).toHaveBeenCalledWith(
      "customer-1",
      expect.objectContaining({ name: "Atualizado" }),
    );
    expect(result).toBe(updated);
  });
});
