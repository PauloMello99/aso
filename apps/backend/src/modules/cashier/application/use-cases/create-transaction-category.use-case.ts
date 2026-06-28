import { Inject, Injectable } from "@nestjs/common";
import { TransactionCategoryEntity } from "../../domain/transaction-category.entity";
import {
  ITransactionCategoryRepository,
  TRANSACTION_CATEGORY_REPOSITORY,
} from "../../domain/transaction-category.repository.interface";

@Injectable()
export class CreateTransactionCategoryUseCase {
  constructor(
    @Inject(TRANSACTION_CATEGORY_REPOSITORY)
    private readonly repo: ITransactionCategoryRepository,
  ) {}

  execute(orgId: string, name: string): Promise<TransactionCategoryEntity> {
    return this.repo.create(orgId, name.trim());
  }
}
