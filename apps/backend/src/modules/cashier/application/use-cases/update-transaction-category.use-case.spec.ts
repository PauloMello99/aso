import { UpdateTransactionCategoryUseCase } from "./update-transaction-category.use-case";
import { ITransactionCategoryRepository } from "../../domain/transaction-category.repository.interface";
import { TransactionCategoryEntity } from "../../domain/transaction-category.entity";
import { TransactionCategoryNotFoundException } from "../../domain/exceptions/transaction-category-not-found.exception";
import { TransactionCategoryNameConflictException } from "../../domain/exceptions/transaction-category-name-conflict.exception";

function buildCategory(
  overrides: Partial<Parameters<typeof TransactionCategoryEntity.create>[0]> = {},
): TransactionCategoryEntity {
  return TransactionCategoryEntity.create({
    id: "cat-1",
    orgId: "org-1",
    name: "Aluguel",
    isProtected: false,
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
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITransactionCategoryRepository>;
}

describe("UpdateTransactionCategoryUseCase", () => {
  it("atualiza o nome (trimado) e retorna a entidade", async () => {
    const category = buildCategory();
    const updated = buildCategory({ name: "Aluguel do salão" });
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(category),
      findByOrg: jest.fn().mockResolvedValue([category]),
      update: jest.fn().mockResolvedValue(updated),
    });
    const useCase = new UpdateTransactionCategoryUseCase(repo);

    const result = await useCase.execute(
      "org-1",
      category.id,
      "  Aluguel do salão  ",
    );

    expect(repo.update).toHaveBeenCalledWith(
      category.id,
      "org-1",
      "Aluguel do salão",
    );
    expect(result).toBe(updated);
  });

  it("lança TransactionCategoryNotFoundException quando a categoria não existe", async () => {
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const useCase = new UpdateTransactionCategoryUseCase(repo);

    await expect(
      useCase.execute("org-1", "missing", "Novo nome"),
    ).rejects.toBeInstanceOf(TransactionCategoryNotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("lança TransactionCategoryNameConflictException quando outra categoria já usa o nome", async () => {
    const category = buildCategory();
    const other = buildCategory({ id: "cat-2", name: "Material" });
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(category),
      findByOrg: jest.fn().mockResolvedValue([category, other]),
    });
    const useCase = new UpdateTransactionCategoryUseCase(repo);

    await expect(
      useCase.execute("org-1", category.id, "Material"),
    ).rejects.toBeInstanceOf(TransactionCategoryNameConflictException);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
