// Injeta DRIZZLE normal (não DRIZZLE_ADMIN): este é o CRUD das campanhas do
// DONO da org (T6 rework, Fatia 5), que roda no contexto do request. As policies
// da migration 0066 fazem o escopo — SELECT `is_super_admin() OR
// is_org_member(org_id)`; INSERT/UPDATE/DELETE `is_super_admin() OR
// is_org_owner(org_id)` (UPDATE com WITH CHECK idêntico ao USING). Contrasta de
// propósito com drizzle-campaign-target.repository e drizzle-campaign-send.
// repository, que injetam DRIZZLE_ADMIN por servirem o cron cross-org sem
// request. Ainda assim, todo método filtra por orgId em AND com o id
// (defense-in-depth sobre a RLS).
import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { Campaign } from "../../domain/campaign.entity";
import type {
  CreateCampaignData,
  ICampaignRepository,
  UpdateCampaignPatch,
} from "../../domain/campaign.repository.interface";
import { CampaignTriggerAlreadyUsedException } from "../../domain/exceptions/campaign-trigger-already-used.exception";
import { CampaignMapper } from "./campaign.mapper";

function pgErrorCode(error: unknown): unknown {
  if (typeof error !== "object" || error === null) return undefined;
  if ("code" in error) return (error as { code?: unknown }).code;
  return undefined;
}

function isUniqueViolation(error: unknown): boolean {
  if (pgErrorCode(error) === "23505") return true;
  if (typeof error === "object" && error !== null && "cause" in error) {
    return pgErrorCode((error as { cause?: unknown }).cause) === "23505";
  }
  return false;
}

@Injectable()
export class DrizzleCampaignRepository implements ICampaignRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAllByOrg(orgId: string): Promise<Campaign[]> {
    // Ordem determinística: createdAt asc + id asc como desempate — mesma
    // convenção de drizzle-campaign-send.repository. Não ordenar por `trigger`:
    // a ordem do pgEnum não é significativa (ver campaign-trigger.ts).
    const rows = await this.db
      .select()
      .from(schema.campaigns)
      .where(eq(schema.campaigns.orgId, orgId))
      .orderBy(asc(schema.campaigns.createdAt), asc(schema.campaigns.id));
    return rows.map((row) => CampaignMapper.toDomain(row));
  }

  async findByIdAndOrg(id: string, orgId: string): Promise<Campaign | null> {
    const [row] = await this.db
      .select()
      .from(schema.campaigns)
      .where(
        and(eq(schema.campaigns.id, id), eq(schema.campaigns.orgId, orgId)),
      )
      .limit(1);
    return row ? CampaignMapper.toDomain(row) : null;
  }

  async create(data: CreateCampaignData): Promise<Campaign> {
    // A unique `campaigns_org_trigger_uq` é o guarda real contra duas campanhas
    // para o mesmo gatilho: o pré-check do use-case perde a corrida de dois
    // POSTs simultâneos. Traduz o 23505 para a exception de domínio (importar
    // domínio no infra é aceito — precedente em drizzle-customer.repository).
    try {
      const [row] = await this.db
        .insert(schema.campaigns)
        .values(CampaignMapper.toInsert(data))
        .returning();
      return CampaignMapper.toDomain(row!);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new CampaignTriggerAlreadyUsedException();
      }
      throw error;
    }
  }

  async update(
    id: string,
    orgId: string,
    patch: UpdateCampaignPatch,
  ): Promise<Campaign | null> {
    const [row] = await this.db
      .update(schema.campaigns)
      .set(CampaignMapper.toUpdateSet(patch))
      .where(
        and(eq(schema.campaigns.id, id), eq(schema.campaigns.orgId, orgId)),
      )
      .returning();
    return row ? CampaignMapper.toDomain(row) : null;
  }

  async delete(id: string, orgId: string): Promise<boolean> {
    const rows = await this.db
      .delete(schema.campaigns)
      .where(
        and(eq(schema.campaigns.id, id), eq(schema.campaigns.orgId, orgId)),
      )
      .returning({ id: schema.campaigns.id });
    return rows.length > 0;
  }
}
