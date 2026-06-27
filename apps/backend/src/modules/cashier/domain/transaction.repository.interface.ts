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
  /** Categoria do lançamento. */
  categoryId?: string;
  /** Faixa de valor líquido (centavos): mínimo inclusivo. */
  minCents?: number;
  /** Faixa de valor líquido (centavos): máximo inclusivo. */
  maxCents?: number;
  /** Busca textual na descrição. */
  q?: string;
  /** users.id — restringe aos lançamentos do membro (funcionário vê só os seus). */
  createdBy?: string;
}

/** Saldos correntes por bucket (todos em centavos, líquido com sinal). */
export interface BalanceSnapshot {
  cashCents: number;
  digitalCents: number;
  totalCents: number;
}

/** Último saldo acumulado de cada dia (para o gráfico do dashboard). */
export interface DailyBalancePoint {
  /** Data no formato YYYY-MM-DD. */
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
  /** Retorna o estorno de uma transação, se existir. */
  findReversalOf(originalId: string): Promise<TransactionEntity | null>;
  /** Conjunto de ids de transações que já possuem estorno (para a lista). */
  findReversedIds(orgId: string): Promise<Set<string>>;
  /** Saldo corrente; `createdBy` restringe aos lançamentos de um membro. */
  balance(orgId: string, createdBy?: string): Promise<BalanceSnapshot>;
  dailyBalanceHistory(
    orgId: string,
    from: Date,
    to: Date,
    createdBy?: string,
  ): Promise<DailyBalancePoint[]>;
}
