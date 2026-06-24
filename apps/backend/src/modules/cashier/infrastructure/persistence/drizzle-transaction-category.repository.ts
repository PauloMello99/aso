import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { TransactionCategoryEntity } from "../../domain/transaction-category.entity";
import { ITransactionCategoryRepository } from "../../domain/transaction-category.repository.interface";

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
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByOrg(orgId: string): Promise<TransactionCategoryEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.transactionCategories)
      .where(eq(schema.transactionCategories.orgId, orgId))
      .orderBy(asc(schema.transactionCategories.name));
    return rows.map(toDomain);
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
    return toDomain(row!);
  }
}
