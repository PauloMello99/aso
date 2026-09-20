import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrgsInfrastructureModule } from "../organizations/infrastructure/orgs-infrastructure.module";
import { ServicesInfrastructureModule } from "../services/infrastructure/services-infrastructure.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { CashierInfrastructureModule } from "./infrastructure/cashier-infrastructure.module";
import { ListTransactionsUseCase } from "./application/use-cases/list-transactions.use-case";
import { ListTransactionsPageUseCase } from "./application/use-cases/list-transactions-page.use-case";
import { ExportTransactionsUseCase } from "./application/use-cases/export-transactions.use-case";
import { CreateTransactionUseCase } from "./application/use-cases/create-transaction.use-case";
import { ReverseTransactionUseCase } from "./application/use-cases/reverse-transaction.use-case";
import { CorrectTransactionUseCase } from "./application/use-cases/correct-transaction.use-case";
import { GetBalanceUseCase } from "./application/use-cases/get-balance.use-case";
import { GetBalanceHistoryUseCase } from "./application/use-cases/get-balance-history.use-case";
import { GetPaymentFeesUseCase } from "./application/use-cases/get-payment-fees.use-case";
import { UpsertPaymentFeesUseCase } from "./application/use-cases/upsert-payment-fees.use-case";
import { GetMemberCommissionsUseCase } from "./application/use-cases/get-member-commissions.use-case";
import { UpsertMemberCommissionsUseCase } from "./application/use-cases/upsert-member-commissions.use-case";
import { GetMemberPaymentFeesUseCase } from "./application/use-cases/get-member-payment-fees.use-case";
import { UpsertMemberPaymentFeesUseCase } from "./application/use-cases/upsert-member-payment-fees.use-case";
import { ListTransactionCategoriesUseCase } from "./application/use-cases/list-transaction-categories.use-case";
import { CreateTransactionCategoryUseCase } from "./application/use-cases/create-transaction-category.use-case";
import { UpdateTransactionCategoryUseCase } from "./application/use-cases/update-transaction-category.use-case";
import { DeleteTransactionCategoryUseCase } from "./application/use-cases/delete-transaction-category.use-case";
import { TransferUseCase } from "./application/use-cases/transfer.use-case";
import { CreateMemberPaymentUseCase } from "./application/use-cases/create-member-payment.use-case";
import { ListMemberPaymentsUseCase } from "./application/use-cases/list-member-payments.use-case";
import { GetMemberPaymentSummaryUseCase } from "./application/use-cases/get-member-payment-summary.use-case";
import { ReverseMemberPaymentUseCase } from "./application/use-cases/reverse-member-payment.use-case";
import { CorrectMemberPaymentUseCase } from "./application/use-cases/correct-member-payment.use-case";
import { GetMemberPaymentReceiptUseCase } from "./application/use-cases/get-member-payment-receipt.use-case";
import { GetMemberReportUseCase } from "./application/use-cases/get-member-report.use-case";
import { CashierController } from "./interface/cashier.controller";
import { MemberPaymentsController } from "./interface/member-payments.controller";

@Module({
  imports: [
    CashierInfrastructureModule,
    OrgsInfrastructureModule,
    ServicesInfrastructureModule,
    AuthModule,
    SubscriptionsModule,
  ],
  controllers: [CashierController, MemberPaymentsController],
  providers: [
    ListTransactionsUseCase,
    ListTransactionsPageUseCase,
    ExportTransactionsUseCase,
    CreateTransactionUseCase,
    ReverseTransactionUseCase,
    CorrectTransactionUseCase,
    GetBalanceUseCase,
    GetBalanceHistoryUseCase,
    GetPaymentFeesUseCase,
    UpsertPaymentFeesUseCase,
    GetMemberCommissionsUseCase,
    UpsertMemberCommissionsUseCase,
    GetMemberPaymentFeesUseCase,
    UpsertMemberPaymentFeesUseCase,
    ListTransactionCategoriesUseCase,
    CreateTransactionCategoryUseCase,
    UpdateTransactionCategoryUseCase,
    DeleteTransactionCategoryUseCase,
    TransferUseCase,
    CreateMemberPaymentUseCase,
    ListMemberPaymentsUseCase,
    GetMemberPaymentSummaryUseCase,
    ReverseMemberPaymentUseCase,
    CorrectMemberPaymentUseCase,
    GetMemberPaymentReceiptUseCase,
    GetMemberReportUseCase,
  ],
  exports: [CashierInfrastructureModule],
})
export class CashierModule {}
