import { Inject, Injectable } from "@nestjs/common";
import {
  ITransactionCategoryRepository,
  TRANSACTION_CATEGORY_REPOSITORY,
} from "../../domain/transaction-category.repository.interface";
import { TransactionCategoryNotFoundException } from "../../domain/exceptions/transaction-category-not-found.exception";
import { TransactionCategoryProtectedException } from "../../domain/exceptions/transaction-category-protected.exception";

@Injectable()
export class DeleteTransactionCategoryUseCase {
  constructor(
    @Inject(TRANSACTION_CATEGORY_REPOSITORY)
    private readonly repo: ITransactionCategoryRepository,
  ) {}

  async execute(orgId: string, id: string): Promise<void> {
    const category = await this.repo.findById(id, orgId);
    if (!category) {
      throw new TransactionCategoryNotFoundException(id);
    }

    if (category.isProtected) {
      throw new TransactionCategoryProtectedException(id);
    }

    await this.repo.delete(id, orgId);
  }
}
