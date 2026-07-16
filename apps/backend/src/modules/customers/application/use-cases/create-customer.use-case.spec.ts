import { CreateCustomerUseCase } from "./create-customer.use-case";
import { ICustomerRepository } from "../../domain/customer.repository.interface";
import { CustomerEntity } from "../../domain/customer.entity";
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
    birthDate: null,
    gender: null,
    address: null,
    addressLine2: null,
    city: null,
    state: null,
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
  const useCase = new CreateCustomerUseCase(customerRepo);
  return { useCase, customerRepo };
}

const baseInput = {
  orgId: "org-1",
  createdBy: "user-1",
  name: "Cliente",
};

describe("CreateCustomerUseCase", () => {
  it("lança CustomerEmailAlreadyExistsException quando findByEmail retorna um cliente", async () => {
    const existing = buildCustomer();
    const { useCase, customerRepo } = buildUseCase({
      findByEmail: jest.fn().mockResolvedValue(existing),
    });

    await expect(
      useCase.execute({ ...baseInput, email: "cliente@example.com" }),
    ).rejects.toBeInstanceOf(CustomerEmailAlreadyExistsException);
    expect(customerRepo.create).not.toHaveBeenCalled();
  });

  it("chama create com email trimado quando findByEmail retorna null", async () => {
    const created = buildCustomer();
    const { useCase, customerRepo } = buildUseCase({
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(created),
    });

    const result = await useCase.execute({
      ...baseInput,
      email: "  cliente@example.com  ",
    });

    expect(customerRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "cliente@example.com" }),
    );
    expect(result).toBe(created);
  });

  it("não chama findByEmail quando email não é enviado", async () => {
    const created = buildCustomer({ email: null });
    const { useCase, customerRepo } = buildUseCase({
      create: jest.fn().mockResolvedValue(created),
    });

    await useCase.execute({ ...baseInput });

    expect(customerRepo.findByEmail).not.toHaveBeenCalled();
    expect(customerRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: null }),
    );
  });
});
