import { DeleteTransactionCategoryUseCase } from "./delete-transaction-category.use-case";
import { ITransactionCategoryRepository } from "../../domain/transaction-category.repository.interface";
import { TransactionCategoryEntity } from "../../domain/transaction-category.entity";
import { TransactionCategoryNotFoundException } from "../../domain/exceptions/transaction-category-not-found.exception";
import { TransactionCategoryProtectedException } from "../../domain/exceptions/transaction-category-protected.exception";

function buildCategory(
  overrides: Partial<Parameters<typeof TransactionCategoryEntity.create>[0]> = {},
): TransactionCategoryEntity {
  return TransactionCategoryEntity.create({
    id: "cat-1",
    orgId: "org-1",
    name: "Aluguel",
    isProtected: false,
    systemKey: null,
    createdAt: new Date("2026-07-01T10:00:00Z"),
    ...overrides,
  });
}

function buildFakeRepo(
  overrides: Partial<jest.Mocked<ITransactionCategoryRepository>> = {},
): jest.Mocked<ITransactionCategoryRepository> {
  return {
    findByOrg: jest.fn(),
    findById: jest.fn(),
    findBySystemKey: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITransactionCategoryRepository>;
}

describe("DeleteTransactionCategoryUseCase", () => {
  it("exclui a categoria não protegida", async () => {
    const category = buildCategory();
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(category),
    });
    const useCase = new DeleteTransactionCategoryUseCase(repo);

    await useCase.execute("org-1", category.id);

    expect(repo.delete).toHaveBeenCalledWith(category.id, "org-1");
  });

  it("lança TransactionCategoryNotFoundException quando a categoria não existe", async () => {
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const useCase = new DeleteTransactionCategoryUseCase(repo);

    await expect(
      useCase.execute("org-1", "missing"),
    ).rejects.toBeInstanceOf(TransactionCategoryNotFoundException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("lança TransactionCategoryProtectedException quando a categoria é protegida", async () => {
    const category = buildCategory({ isProtected: true });
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(category),
    });
    const useCase = new DeleteTransactionCategoryUseCase(repo);

    await expect(
      useCase.execute("org-1", category.id),
    ).rejects.toBeInstanceOf(TransactionCategoryProtectedException);
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
