import { Inject, Injectable } from "@nestjs/common";
import { TransactionCategoryEntity } from "../../domain/transaction-category.entity";
import {
  ITransactionCategoryRepository,
  TRANSACTION_CATEGORY_REPOSITORY,
} from "../../domain/transaction-category.repository.interface";
import { TransactionCategoryNotFoundException } from "../../domain/exceptions/transaction-category-not-found.exception";
import { TransactionCategoryNameConflictException } from "../../domain/exceptions/transaction-category-name-conflict.exception";

@Injectable()
export class UpdateTransactionCategoryUseCase {
  constructor(
    @Inject(TRANSACTION_CATEGORY_REPOSITORY)
    private readonly repo: ITransactionCategoryRepository,
  ) {}

  async execute(
    orgId: string,
    id: string,
    name: string,
  ): Promise<TransactionCategoryEntity> {
    const category = await this.repo.findById(id, orgId);
    if (!category) {
      throw new TransactionCategoryNotFoundException(id);
    }

    const trimmed = name.trim();
    const siblings = await this.repo.findByOrg(orgId);
    if (siblings.some((c) => c.id !== id && c.name === trimmed)) {
      throw new TransactionCategoryNameConflictException(trimmed);
    }

    return this.repo.update(id, orgId, trimmed);
  }
}
