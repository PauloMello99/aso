import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { TRANSACTION_REPOSITORY } from "../domain/transaction.repository.interface";
import { PAYMENT_FEE_REPOSITORY } from "../domain/payment-fee.repository.interface";
import { TRANSACTION_CATEGORY_REPOSITORY } from "../domain/transaction-category.repository.interface";
import { DrizzleTransactionRepository } from "./persistence/drizzle-transaction.repository";
import { DrizzlePaymentFeeRepository } from "./persistence/drizzle-payment-fee.repository";
import { DrizzleTransactionCategoryRepository } from "./persistence/drizzle-transaction-category.repository";

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: TRANSACTION_REPOSITORY, useClass: DrizzleTransactionRepository },
    { provide: PAYMENT_FEE_REPOSITORY, useClass: DrizzlePaymentFeeRepository },
    {
      provide: TRANSACTION_CATEGORY_REPOSITORY,
      useClass: DrizzleTransactionCategoryRepository,
    },
  ],
  exports: [
    TRANSACTION_REPOSITORY,
    PAYMENT_FEE_REPOSITORY,
    TRANSACTION_CATEGORY_REPOSITORY,
  ],
})
export class CashierInfrastructureModule {}
