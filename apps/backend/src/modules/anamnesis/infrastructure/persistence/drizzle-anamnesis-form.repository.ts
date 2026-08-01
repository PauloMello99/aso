import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, max } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { AnamnesisFormVersionEntity } from "../../domain/anamnesis-form-version.entity";
import {
  CreateAnamnesisFormVersionData,
  IAnamnesisFormRepository,
} from "../../domain/anamnesis-form.repository.interface";

function toDomain(
  row: typeof schema.anamnesisFormVersions.$inferSelect,
): AnamnesisFormVersionEntity {
  return AnamnesisFormVersionEntity.create({
    id: row.id,
    formId: row.formId,
    orgId: row.orgId,
    versionNumber: row.versionNumber,
    questions: row.questions,
    createdBy: row.createdBy ?? null,
    createdAt: row.createdAt,
  });
}

@Injectable()
export class DrizzleAnamnesisFormRepository
  implements IAnamnesisFormRepository
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getCurrentVersion(
    serviceTypeId: string,
    orgId: string,
  ): Promise<AnamnesisFormVersionEntity | null> {
    const [row] = await this.db
      .select({ version: schema.anamnesisFormVersions })
      .from(schema.anamnesisForms)
      .innerJoin(
        schema.anamnesisFormVersions,
        eq(schema.anamnesisFormVersions.formId, schema.anamnesisForms.id),
      )
      .where(
        and(
          eq(schema.anamnesisForms.serviceTypeId, serviceTypeId),
          eq(schema.anamnesisForms.orgId, orgId),
        ),
      )
      .orderBy(desc(schema.anamnesisFormVersions.versionNumber))
      .limit(1);
    return row ? toDomain(row.version) : null;
  }

  async listVersions(
    serviceTypeId: string,
    orgId: string,
  ): Promise<AnamnesisFormVersionEntity[]> {
    const rows = await this.db
      .select({ version: schema.anamnesisFormVersions })
      .from(schema.anamnesisForms)
      .innerJoin(
        schema.anamnesisFormVersions,
        eq(schema.anamnesisFormVersions.formId, schema.anamnesisForms.id),
      )
      .where(
        and(
          eq(schema.anamnesisForms.serviceTypeId, serviceTypeId),
          eq(schema.anamnesisForms.orgId, orgId),
        ),
      )
      .orderBy(desc(schema.anamnesisFormVersions.versionNumber));
    return rows.map((r) => toDomain(r.version));
  }

  async createVersion(
    data: CreateAnamnesisFormVersionData,
  ): Promise<AnamnesisFormVersionEntity> {
    return this.db.transaction(async (tx) => {
      let [form] = await tx
        .select()
        .from(schema.anamnesisForms)
        .where(
          and(
            eq(schema.anamnesisForms.serviceTypeId, data.serviceTypeId),
            eq(schema.anamnesisForms.orgId, data.orgId),
          ),
        )
        .limit(1);

      if (!form) {
        [form] = await tx
          .insert(schema.anamnesisForms)
          .values({ orgId: data.orgId, serviceTypeId: data.serviceTypeId })
          .returning();
      }

      const [agg] = await tx
        .select({ maxVersion: max(schema.anamnesisFormVersions.versionNumber) })
        .from(schema.anamnesisFormVersions)
        .where(eq(schema.anamnesisFormVersions.formId, form!.id));

      const [version] = await tx
        .insert(schema.anamnesisFormVersions)
        .values({
          formId: form!.id,
          orgId: data.orgId,
          versionNumber: (agg?.maxVersion ?? 0) + 1,
          questions: data.questions,
          createdBy: data.createdBy,
        })
        .returning();

      return toDomain(version!);
    });
  }
}
