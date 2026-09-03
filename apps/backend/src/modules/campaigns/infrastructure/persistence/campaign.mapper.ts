import type {
  Campaign as CampaignRow,
  NewCampaign,
} from "../../../../database/schema/studio/campaigns";
import type { Campaign } from "../../domain/campaign.entity";
import type {
  CreateCampaignData,
  UpdateCampaignPatch,
} from "../../domain/campaign.repository.interface";

/**
 * Mapeamento puro entre a row de `campaigns` (Drizzle) e a entidade de domínio.
 * `export class XMapper { static ... }` — mesmo molde de `CustomerMapper` e da
 * maioria dos mappers do backend. Sem validação aqui: `row.body` já é
 * `TiptapDoc | null` pelo `$type` do schema (Fatia 3) e a allowlist do corpo é
 * aplicada no use-case (passo 6).
 */
export class CampaignMapper {
  static toDomain(row: CampaignRow): Campaign {
    return {
      id: row.id,
      orgId: row.orgId,
      trigger: row.trigger,
      name: row.name,
      enabled: row.enabled,
      subject: row.subject,
      body: row.body,
      inactivityMonths: row.inactivityMonths,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Valores para o INSERT. `id`/`createdAt`/`updatedAt` não são setados — o
   * banco preenche pelo DEFAULT.
   */
  static toInsert(data: CreateCampaignData): NewCampaign {
    return {
      orgId: data.orgId,
      trigger: data.trigger,
      name: data.name,
      enabled: data.enabled,
      subject: data.subject,
      body: data.body,
      inactivityMonths: data.inactivityMonths,
    };
  }

  /**
   * `SET` do UPDATE: só as chaves presentes no patch (checagem `!== undefined`,
   * para que `null` grave SQL NULL e uma chave ausente não sobrescreva a
   * coluna). `updatedAt` é sempre setado — a tabela não tem trigger de
   * `updated_at` (migration 0066) e garante que o objeto nunca fica vazio.
   */
  static toUpdateSet(patch: UpdateCampaignPatch): Partial<NewCampaign> {
    return {
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.enabled !== undefined && { enabled: patch.enabled }),
      ...(patch.subject !== undefined && { subject: patch.subject }),
      ...(patch.body !== undefined && { body: patch.body }),
      ...(patch.inactivityMonths !== undefined && {
        inactivityMonths: patch.inactivityMonths,
      }),
      updatedAt: new Date(),
    };
  }
}
