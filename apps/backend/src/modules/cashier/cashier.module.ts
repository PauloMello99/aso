import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrgsInfrastructureModule } from "../organizations/infrastructure/orgs-infrastructure.module";
import { ServicesInfrastructureModule } from "../services/infrastructure/services-infrastructure.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { CashierInfrastructureModule } from "./infrastructure/cashier-infrastructure.module";
import { ListTransactionsUseCase } from "./application/use-cases/list-transactions.use-case";
import { ExportTransactionsUseCase } from "./application/use-cases/export-transactions.use-case";
import { CreateTransactionUseCase } from "./application/use-cases/create-transaction.use-case";
import { ReverseTransactionUseCase } from "./application/use-cases/reverse-transaction.use-case";
import { CorrectTransactionUseCase } from "./application/use-cases/correct-transaction.use-case";
import { GetBalanceUseCase } from "./application/use-cases/get-balance.use-case";
import { GetBalanceHistoryUseCase } from "./application/use-cases/get-balance-history.use-case";
import { GetPaymentFeesUseCase } from "./application/use-cases/get-payment-fees.use-case";
import { UpsertPaymentFeesUseCase } from "./application/use-cases/upsert-payment-fees.use-case";
import { ListTransactionCategoriesUseCase } from "./application/use-cases/list-transaction-categories.use-case";
import { CreateTransactionCategoryUseCase } from "./application/use-cases/create-transaction-category.use-case";
import { UpdateTransactionCategoryUseCase } from "./application/use-cases/update-transaction-category.use-case";
import { DeleteTransactionCategoryUseCase } from "./application/use-cases/delete-transaction-category.use-case";
import { TransferUseCase } from "./application/use-cases/transfer.use-case";
import { CashierController } from "./interface/cashier.controller";

@Module({
  imports: [
    CashierInfrastructureModule,
    OrgsInfrastructureModule,
    ServicesInfrastructureModule,
    AuthModule,
    SubscriptionsModule,
  ],
  controllers: [CashierController],
  providers: [
    ListTransactionsUseCase,
    ExportTransactionsUseCase,
    CreateTransactionUseCase,
    ReverseTransactionUseCase,
    CorrectTransactionUseCase,
    GetBalanceUseCase,
    GetBalanceHistoryUseCase,
    GetPaymentFeesUseCase,
    UpsertPaymentFeesUseCase,
    ListTransactionCategoriesUseCase,
    CreateTransactionCategoryUseCase,
    UpdateTransactionCategoryUseCase,
    DeleteTransactionCategoryUseCase,
    TransferUseCase,
  ],
  exports: [CashierInfrastructureModule],
})
export class CashierModule {}
