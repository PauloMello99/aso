import {
  CreateTransactionData,
  PaymentMethod,
  TransactionEntity,
  TransactionType,
} from "./transaction.entity";

export const TRANSACTION_REPOSITORY = Symbol("TRANSACTION_REPOSITORY");

export interface ListTransactionsFilter {
  from?: Date;
  to?: Date;
  type?: TransactionType;
  paymentMethod?: PaymentMethod;
  categoryId?: string;
  minCents?: number;
  maxCents?: number;
  q?: string;
  createdBy?: string;
  customerId?: string;
}

export interface BalanceSnapshot {
  cashCents: number;
  digitalCents: number;
  totalCents: number;
}

export interface DailyBalancePoint {
  day: string;
  cashCents: number;
  digitalCents: number;
  totalCents: number;
}

export interface ITransactionRepository {
  create(data: CreateTransactionData): Promise<TransactionEntity>;
  findById(id: string, orgId: string): Promise<TransactionEntity | null>;
  findAllByOrg(
    orgId: string,
    filter?: ListTransactionsFilter,
  ): Promise<TransactionEntity[]>;
  findPageByOrg(
    orgId: string,
    filter: ListTransactionsFilter | undefined,
    pagination: { limit: number; offset: number },
  ): Promise<{ rows: TransactionEntity[]; total: number }>;
  findReversalOf(originalId: string): Promise<TransactionEntity | null>;
  findReversedIds(orgId: string): Promise<Set<string>>;
  findReversedIdsIn(orgId: string, ids: string[]): Promise<Set<string>>;
  balance(orgId: string, createdBy?: string): Promise<BalanceSnapshot>;
  dailyBalanceHistory(
    orgId: string,
    from: Date,
    to: Date,
    createdBy?: string,
  ): Promise<DailyBalancePoint[]>;
  incomeByPaymentMethod(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<PaymentMethodTotal[]>;
  incomeExpenseSeries(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<IncomeExpensePoint[]>;
}

export interface PaymentMethodTotal {
  paymentMethod: PaymentMethod;
  netCents: number;
}

export interface IncomeExpensePoint {
  day: string;
  incomeCents: number;
  expenseCents: number;
}
