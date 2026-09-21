import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { TRANSACTION_REPOSITORY } from "../domain/transaction.repository.interface";
import { PAYMENT_FEE_REPOSITORY } from "../domain/payment-fee.repository.interface";
import { TRANSACTION_CATEGORY_REPOSITORY } from "../domain/transaction-category.repository.interface";
import { MEMBER_COMMISSION_REPOSITORY } from "../domain/member-commission.repository.interface";
import { MEMBER_PAYMENT_FEE_REPOSITORY } from "../domain/member-payment-fee.repository.interface";
import { MEMBER_PAYMENT_REPOSITORY } from "../domain/member-payment.repository.interface";
import { MEMBER_DOCUMENT_GENERATOR } from "../domain/ports/member-document-generator.port";
import { PdfKitMemberDocumentGenerator } from "./providers/pdfkit-member-document.generator";
import { DrizzleTransactionRepository } from "./persistence/drizzle-transaction.repository";
import { DrizzlePaymentFeeRepository } from "./persistence/drizzle-payment-fee.repository";
import { DrizzleTransactionCategoryRepository } from "./persistence/drizzle-transaction-category.repository";
import { DrizzleMemberCommissionRepository } from "./persistence/drizzle-member-commission.repository";
import { DrizzleMemberPaymentFeeRepository } from "./persistence/drizzle-member-payment-fee.repository";
import { DrizzleMemberPaymentRepository } from "./persistence/drizzle-member-payment.repository";

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: TRANSACTION_REPOSITORY, useClass: DrizzleTransactionRepository },
    { provide: PAYMENT_FEE_REPOSITORY, useClass: DrizzlePaymentFeeRepository },
    {
      provide: TRANSACTION_CATEGORY_REPOSITORY,
      useClass: DrizzleTransactionCategoryRepository,
    },
    {
      provide: MEMBER_COMMISSION_REPOSITORY,
      useClass: DrizzleMemberCommissionRepository,
    },
    {
      provide: MEMBER_PAYMENT_FEE_REPOSITORY,
      useClass: DrizzleMemberPaymentFeeRepository,
    },
    {
      provide: MEMBER_PAYMENT_REPOSITORY,
      useClass: DrizzleMemberPaymentRepository,
    },
    {
      provide: MEMBER_DOCUMENT_GENERATOR,
      useClass: PdfKitMemberDocumentGenerator,
    },
  ],
  exports: [
    TRANSACTION_REPOSITORY,
    PAYMENT_FEE_REPOSITORY,
    TRANSACTION_CATEGORY_REPOSITORY,
    MEMBER_COMMISSION_REPOSITORY,
    MEMBER_PAYMENT_FEE_REPOSITORY,
    MEMBER_PAYMENT_REPOSITORY,
    MEMBER_DOCUMENT_GENERATOR,
  ],
})
export class CashierInfrastructureModule {}
