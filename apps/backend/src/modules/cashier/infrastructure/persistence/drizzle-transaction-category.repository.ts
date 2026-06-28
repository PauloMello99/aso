import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import { TtlCache } from "../../../../common/cache/ttl-cache.service";
import * as schema from "../../../../database/schema";
import { TransactionCategoryEntity } from "../../domain/transaction-category.entity";
import { ITransactionCategoryRepository } from "../../domain/transaction-category.repository.interface";

/** Categorias mudam raramente e aparecem em todo form de lançamento. */
const CATEGORIES_TTL_MS = 60 * 60 * 1000; // 1h
const categoriesKey = (orgId: string) => `categories:${orgId}`;

function toDomain(row: typeof schema.transactionCategories.$inferSelect) {
  return TransactionCategoryEntity.create({
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    createdAt: row.createdAt,
  });
}

@Injectable()
export class DrizzleTransactionCategoryRepository
  implements ITransactionCategoryRepository
{
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly cache: TtlCache,
  ) {}

  async findByOrg(orgId: string): Promise<TransactionCategoryEntity[]> {
    return this.cache.wrap(categoriesKey(orgId), CATEGORIES_TTL_MS, async () => {
      const rows = await this.db
        .select()
        .from(schema.transactionCategories)
        .where(eq(schema.transactionCategories.orgId, orgId))
        .orderBy(asc(schema.transactionCategories.name));
      return rows.map(toDomain);
    });
  }

  async findById(
    id: string,
    orgId: string,
  ): Promise<TransactionCategoryEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.transactionCategories)
      .where(
        and(
          eq(schema.transactionCategories.id, id),
          eq(schema.transactionCategories.orgId, orgId),
        ),
      )
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async create(orgId: string, name: string): Promise<TransactionCategoryEntity> {
    const [row] = await this.db
      .insert(schema.transactionCategories)
      .values({ orgId, name })
      .onConflictDoUpdate({
        target: [
          schema.transactionCategories.orgId,
          schema.transactionCategories.name,
        ],
        set: { name },
      })
      .returning();
    this.cache.del(categoriesKey(orgId));
    return toDomain(row!);
  }
}
