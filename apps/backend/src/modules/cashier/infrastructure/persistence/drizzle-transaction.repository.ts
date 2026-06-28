import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, ilike, isNotNull, lte, sql } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  CreateTransactionData,
  TransactionEntity,
} from "../../domain/transaction.entity";
import {
  BalanceSnapshot,
  DailyBalancePoint,
  IncomeExpensePoint,
  ITransactionRepository,
  ListTransactionsFilter,
  PaymentMethodTotal,
} from "../../domain/transaction.repository.interface";
import { PaymentMethod } from "../../domain/transaction.entity";
import { TransactionMapper } from "./transaction.mapper";

// Buckets de saldo: dinheiro vs digital (banco/cartão). `credits` fica fora do caixa.
const DIGITAL_METHODS = ["bank_transfer", "credit_card", "debit_card"] as const;

@Injectable()
export class DrizzleTransactionRepository implements ITransactionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(data: CreateTransactionData): Promise<TransactionEntity> {
    const [row] = await this.db
      .insert(schema.transactions)
      .values({
        orgId: data.orgId,
        createdBy: data.createdBy ?? null,
        description: data.description,
        type: data.type,
        amountCents: data.netCents,
        amountGrossCents: data.grossCents,
        feeCents: data.feeCents,
        paymentMethod: data.paymentMethod,
        categoryId: data.categoryId ?? null,
        reversesTransactionId: data.reversesTransactionId ?? null,
        ...(data.transactedAt ? { transactedAt: data.transactedAt } : {}),
      })
      .returning();
    return TransactionMapper.toDomain(row!);
  }

  async findById(
    id: string,
    orgId: string,
  ): Promise<TransactionEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.id, id),
          eq(schema.transactions.orgId, orgId),
        ),
      )
      .limit(1);
    return row ? TransactionMapper.toDomain(row) : null;
  }

  async findAllByOrg(
    orgId: string,
    filter?: ListTransactionsFilter,
  ): Promise<TransactionEntity[]> {
    const conditions = [eq(schema.transactions.orgId, orgId)];

    if (filter?.from) {
      conditions.push(gte(schema.transactions.transactedAt, filter.from));
    }
    if (filter?.to) {
      conditions.push(lte(schema.transactions.transactedAt, filter.to));
    }
    if (filter?.type) {
      conditions.push(eq(schema.transactions.type, filter.type));
    }
    if (filter?.paymentMethod) {
      conditions.push(
        eq(schema.transactions.paymentMethod, filter.paymentMethod),
      );
    }
    if (filter?.categoryId) {
      conditions.push(eq(schema.transactions.categoryId, filter.categoryId));
    }
    if (filter?.minCents !== undefined) {
      conditions.push(gte(schema.transactions.amountCents, filter.minCents));
    }
    if (filter?.maxCents !== undefined) {
      conditions.push(lte(schema.transactions.amountCents, filter.maxCents));
    }
    if (filter?.q) {
      conditions.push(ilike(schema.transactions.description, `%${filter.q}%`));
    }
    if (filter?.createdBy) {
      conditions.push(eq(schema.transactions.createdBy, filter.createdBy));
    }

    const rows = await this.db
      .select()
      .from(schema.transactions)
      .where(and(...conditions))
      .orderBy(desc(schema.transactions.transactedAt));

    return rows.map(TransactionMapper.toDomain);
  }

  async findReversalOf(originalId: string): Promise<TransactionEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.reversesTransactionId, originalId))
      .limit(1);
    return row ? TransactionMapper.toDomain(row) : null;
  }

  async findReversedIds(orgId: string): Promise<Set<string>> {
    const rows = await this.db
      .select({ reverses: schema.transactions.reversesTransactionId })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.orgId, orgId),
          isNotNull(schema.transactions.reversesTransactionId),
        ),
      );
    return new Set(
      rows
        .map((r) => r.reverses)
        .filter((id): id is string => id !== null),
    );
  }

  async balance(orgId: string, createdBy?: string): Promise<BalanceSnapshot> {
    const digitalList = sql.join(
      DIGITAL_METHODS.map((m) => sql`${m}`),
      sql`, `,
    );
    const createdByFilter = createdBy
      ? sql` AND created_by = ${createdBy}`
      : sql``;
    const { rows } = await this.db.execute<{
      cash_cents: string;
      digital_cents: string;
    }>(sql`
      SELECT
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN signed END), 0)::bigint AS cash_cents,
        COALESCE(SUM(CASE WHEN payment_method IN (${digitalList}) THEN signed END), 0)::bigint AS digital_cents
      FROM (
        SELECT payment_method,
          CASE WHEN type = 'income' THEN amount_cents ELSE -amount_cents END AS signed
        FROM transactions
        WHERE org_id = ${orgId}${createdByFilter}
      ) t
    `);
    const cashCents = Number(rows[0]?.cash_cents ?? 0);
    const digitalCents = Number(rows[0]?.digital_cents ?? 0);
    return { cashCents, digitalCents, totalCents: cashCents + digitalCents };
  }

  async dailyBalanceHistory(
    orgId: string,
    from: Date,
    to: Date,
    createdBy?: string,
  ): Promise<DailyBalancePoint[]> {
    const digitalList = sql.join(
      DIGITAL_METHODS.map((m) => sql`${m}`),
      sql`, `,
    );
    const createdByFilter = createdBy
      ? sql` AND created_by = ${createdBy}`
      : sql``;
    // Running sum sobre TODO o histórico (não só o intervalo), depois recorta
    // [from, to] — assim cada ponto reflete o saldo acumulado real do dia.
    const { rows } = await this.db.execute<{
      day: string;
      cash_cents: string;
      digital_cents: string;
    }>(sql`
      WITH daily AS (
        SELECT date_trunc('day', transacted_at)::date AS day,
          SUM(CASE WHEN payment_method = 'cash' THEN signed ELSE 0 END) AS cash_delta,
          SUM(CASE WHEN payment_method IN (${digitalList}) THEN signed ELSE 0 END) AS digital_delta
        FROM (
          SELECT transacted_at, payment_method,
            CASE WHEN type = 'income' THEN amount_cents ELSE -amount_cents END AS signed
          FROM transactions
          WHERE org_id = ${orgId}${createdByFilter}
        ) t
        GROUP BY 1
      ),
      running AS (
        SELECT day,
          SUM(cash_delta) OVER (ORDER BY day)::bigint AS cash_cents,
          SUM(digital_delta) OVER (ORDER BY day)::bigint AS digital_cents
        FROM daily
      )
      SELECT to_char(day, 'YYYY-MM-DD') AS day, cash_cents, digital_cents
      FROM running
      WHERE day BETWEEN ${from}::date AND ${to}::date
      ORDER BY day
    `);

    return rows.map((r) => {
      const cashCents = Number(r.cash_cents);
      const digitalCents = Number(r.digital_cents);
      return {
        day: r.day,
        cashCents,
        digitalCents,
        totalCents: cashCents + digitalCents,
      };
    });
  }

  async incomeByPaymentMethod(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<PaymentMethodTotal[]> {
    const { rows } = await this.db.execute<{
      payment_method: string;
      net_cents: string;
    }>(sql`
      SELECT payment_method,
        COALESCE(SUM(amount_cents), 0)::bigint AS net_cents
      FROM transactions
      WHERE org_id = ${orgId}
        AND type = 'income'
        AND transacted_at >= ${from}
        AND transacted_at <= ${to}
      GROUP BY payment_method
      ORDER BY net_cents DESC
    `);
    return rows.map((r) => ({
      paymentMethod: r.payment_method as PaymentMethod,
      netCents: Number(r.net_cents),
    }));
  }

  async incomeExpenseSeries(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<IncomeExpensePoint[]> {
    const { rows } = await this.db.execute<{
      day: string;
      income_cents: string;
      expense_cents: string;
    }>(sql`
      SELECT to_char(date_trunc('day', transacted_at)::date, 'YYYY-MM-DD') AS day,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END), 0)::bigint AS income_cents,
        COALESCE(SUM(CASE WHEN type = 'outcome' THEN amount_cents ELSE 0 END), 0)::bigint AS expense_cents
      FROM transactions
      WHERE org_id = ${orgId}
        AND transacted_at >= ${from}
        AND transacted_at <= ${to}
      GROUP BY 1
      ORDER BY 1
    `);
    return rows.map((r) => ({
      day: r.day,
      incomeCents: Number(r.income_cents),
      expenseCents: Number(r.expense_cents),
    }));
  }
}
