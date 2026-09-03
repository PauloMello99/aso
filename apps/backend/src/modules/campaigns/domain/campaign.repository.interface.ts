import type { TiptapDoc } from "./campaign-body";
import type { Campaign } from "./campaign.entity";
import type { CampaignTrigger } from "./campaign-trigger";

export const CAMPAIGN_REPOSITORY = Symbol("CAMPAIGN_REPOSITORY");

/**
 * Dados para criar uma campanha. `trigger` só entra na criação — é imutável
 * depois (a unique `campaigns_org_trigger_uq` e o CHECK de `inactivityMonths`
 * dependem dele). `subject`/`body`/`inactivityMonths` são `... | null` e não
 * opcionais: o use-case (passo 6) sempre resolve o valor antes de chamar.
 */
export interface CreateCampaignData {
  orgId: string;
  trigger: CampaignTrigger;
  name: string;
  enabled: boolean;
  subject: string | null;
  body: TiptapDoc | null;
  inactivityMonths: number | null;
}

/**
 * Patch parcial de update — só as chaves presentes são gravadas. Sem `trigger`
 * (imutável após a criação). `null` significa "gravar SQL NULL" (volta ao texto
 * default autoral); ausência da chave significa "não mexer nessa coluna".
 */
export interface UpdateCampaignPatch {
  name?: string;
  enabled?: boolean;
  subject?: string | null;
  body?: TiptapDoc | null;
  inactivityMonths?: number | null;
}

/**
 * CRUD de campanhas do DONO da org. A implementação (`DrizzleCampaignRepository`)
 * injeta `DRIZZLE` (pool com RLS por request), em contraste EXPLÍCITO com
 * `drizzle-campaign-target.repository.ts` e `drizzle-campaign-send.repository.ts`,
 * que injetam `DRIZZLE_ADMIN` por rodarem no cron cross-org sem contexto de
 * request. Aqui o ator é o dono autenticado, então a RLS da org se aplica — e
 * todo método ainda filtra por `orgId` em AND com o `id` (defense-in-depth).
 */
export interface ICampaignRepository {
  findAllByOrg(orgId: string): Promise<Campaign[]>;
  findByIdAndOrg(id: string, orgId: string): Promise<Campaign | null>;
  create(data: CreateCampaignData): Promise<Campaign>;
  update(
    id: string,
    orgId: string,
    patch: UpdateCampaignPatch,
  ): Promise<Campaign | null>;
  delete(id: string, orgId: string): Promise<boolean>;
}
