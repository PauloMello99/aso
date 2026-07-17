import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { OrgOwnerGuard } from "../../auth/guards/org-owner.guard";
import { OrgModuleGuard } from "../../auth/guards/org-module.guard";
import { RequireModule } from "../../auth/decorators/require-module.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { ListTransactionsUseCase } from "../application/use-cases/list-transactions.use-case";
import { ExportTransactionsUseCase } from "../application/use-cases/export-transactions.use-case";
import { parseFields } from "../../../common/csv/csv.util";
import { CreateTransactionUseCase } from "../application/use-cases/create-transaction.use-case";
import { ReverseTransactionUseCase } from "../application/use-cases/reverse-transaction.use-case";
import { CorrectTransactionUseCase } from "../application/use-cases/correct-transaction.use-case";
import { GetBalanceUseCase } from "../application/use-cases/get-balance.use-case";
import { GetBalanceHistoryUseCase } from "../application/use-cases/get-balance-history.use-case";
import { GetPaymentFeesUseCase } from "../application/use-cases/get-payment-fees.use-case";
import { UpsertPaymentFeesUseCase } from "../application/use-cases/upsert-payment-fees.use-case";
import { ListTransactionCategoriesUseCase } from "../application/use-cases/list-transaction-categories.use-case";
import { CreateTransactionCategoryUseCase } from "../application/use-cases/create-transaction-category.use-case";
import { UpdateTransactionCategoryUseCase } from "../application/use-cases/update-transaction-category.use-case";
import { DeleteTransactionCategoryUseCase } from "../application/use-cases/delete-transaction-category.use-case";
import { TransferUseCase } from "../application/use-cases/transfer.use-case";
import {
  CreateTransactionDto,
  PAYMENT_METHODS,
  TRANSACTION_TYPES,
} from "./dto/create-transaction.dto";
import { CorrectTransactionDto } from "./dto/correct-transaction.dto";
import { UpsertFeesDto } from "./dto/upsert-fees.dto";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { TransferDto } from "./dto/transfer.dto";

type TransactionType = (typeof TRANSACTION_TYPES)[number];
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Converte um query param numérico (centavos) em inteiro, ou undefined. */
function parseCents(value?: string): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

// Caixa aberto a membros: funcionário lança e vê só os próprios; owner vê tudo e
// lança em nome de. Operações sensíveis (taxas, transferência, estorno, correção,
// criar categoria) seguem owner-only via OrgOwnerGuard a nível de método.
@Controller("orgs/:orgId/cashier")
@UseGuards(AuthGuard, OrgMembershipGuard, OrgModuleGuard)
@RequireModule("cashier")
export class CashierController {
  constructor(
    private readonly listTransactions: ListTransactionsUseCase,
    private readonly exportTransactions: ExportTransactionsUseCase,
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly reverseTransaction: ReverseTransactionUseCase,
    private readonly correctTransaction: CorrectTransactionUseCase,
    private readonly getBalance: GetBalanceUseCase,
    private readonly getBalanceHistory: GetBalanceHistoryUseCase,
    private readonly getPaymentFees: GetPaymentFeesUseCase,
    private readonly upsertPaymentFees: UpsertPaymentFeesUseCase,
    private readonly listCategories: ListTransactionCategoriesUseCase,
    private readonly createCategory: CreateTransactionCategoryUseCase,
    private readonly updateCategory: UpdateTransactionCategoryUseCase,
    private readonly deleteCategory: DeleteTransactionCategoryUseCase,
    private readonly transfer: TransferUseCase,
  ) {}

  @Get("transactions")
  async list(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("type") type?: string,
    @Query("paymentMethod") paymentMethod?: string,
    @Query("categoryId") categoryId?: string,
    @Query("minCents") minCents?: string,
    @Query("maxCents") maxCents?: string,
    @Query("createdBy") createdBy?: string,
    @Query("q") q?: string,
    @Query("customerId") customerId?: string,
  ) {
    return this.listTransactions.execute({
      orgId,
      authId: user.id,
      filter: {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        type: TRANSACTION_TYPES.includes(type as TransactionType)
          ? (type as TransactionType)
          : undefined,
        paymentMethod: PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)
          ? (paymentMethod as PaymentMethod)
          : undefined,
        categoryId: categoryId || undefined,
        minCents: parseCents(minCents),
        maxCents: parseCents(maxCents),
        // Owner pode filtrar por membro; para funcionário o use-case força o próprio id.
        createdBy: createdBy || undefined,
        q: q || undefined,
        customerId: customerId || undefined,
      },
    });
  }

  @Get("transactions/export")
  async export(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("type") type?: string,
    @Query("paymentMethod") paymentMethod?: string,
    @Query("categoryId") categoryId?: string,
    @Query("minCents") minCents?: string,
    @Query("maxCents") maxCents?: string,
    @Query("createdBy") createdBy?: string,
    @Query("q") q?: string,
    @Query("customerId") customerId?: string,
    @Query("fields") fields?: string,
  ) {
    const csv = await this.exportTransactions.execute(
      orgId,
      user.id,
      {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        type: TRANSACTION_TYPES.includes(type as TransactionType)
          ? (type as TransactionType)
          : undefined,
        paymentMethod: PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)
          ? (paymentMethod as PaymentMethod)
          : undefined,
        categoryId: categoryId || undefined,
        minCents: parseCents(minCents),
        maxCents: parseCents(maxCents),
        createdBy: createdBy || undefined,
        q: q || undefined,
        customerId: customerId || undefined,
      },
      parseFields(fields),
    );
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="caixa-${date}.csv"`,
    );
    res.send(csv);
  }

  @Post("transactions")
  async create(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.createTransaction.execute({
      orgId,
      authId: user.id,
      createdBy: dto.createdBy ?? null,
      description: dto.description,
      type: dto.type,
      grossCents: dto.grossCents,
      paymentMethod: dto.paymentMethod,
      categoryId: dto.categoryId ?? null,
      transactedAt: dto.transactedAt ? new Date(dto.transactedAt) : undefined,
    });
  }

  @Post("transactions/:id/reverse")
  @UseGuards(OrgOwnerGuard)
  async reverse(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reverseTransaction.execute({
      orgId,
      transactionId: id,
      reversedBy: user.id,
    });
  }

  @Post("transactions/:id/correct")
  @UseGuards(OrgOwnerGuard)
  async correct(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CorrectTransactionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.correctTransaction.execute({
      orgId,
      transactionId: id,
      correctedBy: user.id,
      description: dto.description,
      type: dto.type,
      grossCents: dto.grossCents,
      paymentMethod: dto.paymentMethod,
      transactedAt: dto.transactedAt ? new Date(dto.transactedAt) : undefined,
    });
  }

  @Get("balance")
  async balance(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.getBalance.execute(orgId, user.id);
  }

  @Get("balance/history")
  async balanceHistory(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * DAY_MS);
    return this.getBalanceHistory.execute(orgId, user.id, fromDate, toDate);
  }

  @Get("fees")
  async fees(@Param("orgId", ParseUUIDPipe) orgId: string) {
    return this.getPaymentFees.execute(orgId);
  }

  @Put("fees")
  @UseGuards(OrgOwnerGuard)
  async setFees(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Body() dto: UpsertFeesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.upsertPaymentFees.execute({
      orgId,
      authId: user.id,
      fees: dto.fees,
    });
  }

  @Get("categories")
  async categories(@Param("orgId", ParseUUIDPipe) orgId: string) {
    return this.listCategories.execute(orgId);
  }

  @Post("categories")
  @UseGuards(OrgOwnerGuard)
  async addCategory(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.createCategory.execute(orgId, dto.name);
  }

  @Put("categories/:categoryId")
  @UseGuards(OrgOwnerGuard)
  async updateCategoryById(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.updateCategory.execute(orgId, categoryId, dto.name);
  }

  @Delete("categories/:categoryId")
  @UseGuards(OrgOwnerGuard)
  async deleteCategoryById(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
  ) {
    return this.deleteCategory.execute(orgId, categoryId);
  }

  @Post("transfers")
  @UseGuards(OrgOwnerGuard)
  async makeTransfer(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Body() dto: TransferDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transfer.execute({
      orgId,
      createdBy: user.id,
      fromMethod: dto.fromMethod,
      toMethod: dto.toMethod,
      amountCents: dto.amountCents,
      description: dto.description,
      transactedAt: dto.transactedAt ? new Date(dto.transactedAt) : undefined,
    });
  }
}
