import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";
import type { TiptapDoc } from "../../domain/campaign-body";

const NAME_MAX_LENGTH = 80;
const SUBJECT_MAX_LENGTH = 200;
const INACTIVITY_MONTHS_MIN = 1;
const INACTIVITY_MONTHS_MAX = 36;

/**
 * Payload do `PATCH /orgs/:orgId/campaigns/:id` (T6 rework, Fatia 7). Todos os
 * campos são opcionais — só as chaves PRESENTES entram no `patch` e o use-case
 * (Fatia 6) grava só essas colunas. Serve também o toggle simples (`{ enabled }`).
 * `name` usa `@ValidateIf(... !== undefined)` em vez de `@IsOptional()`: ausente é
 * pulado, mas `null` explícito cai em `@IsString()` → 400 (a coluna é NOT NULL e
 * `normalizePatch` faria `null.trim()`). `subject`/`body` seguem com `@IsOptional()`
 * porque `null` neles é intencional (volta ao texto default autoral).
 *
 * SEM `trigger`: é imutável após a criação (a unique `campaigns_org_trigger_uq` e
 * o CHECK de `inactivityMonths` dependem dele) e nem entra em
 * `UpdateCampaignPatch`. `body` segue a mesma regra do create: `@IsObject()` só,
 * validação forte no `validateCampaignBody` do use-case. Tetos casam com os
 * CHECKs do banco (`campaigns_name_check` 1..80, `campaigns_subject_check`
 * <=200). A coerência `inactivityMonths` x gatilho da campanha existente é
 * decidida no use-case.
 */
export class UpdateCampaignDto {
  @ValidateIf((o: UpdateCampaignDto) => o.name !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(NAME_MAX_LENGTH)
  @Matches(/\S/, { message: "name must contain a non-whitespace character" })
  name?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(SUBJECT_MAX_LENGTH)
  subject?: string | null;

  @IsOptional()
  @IsObject()
  body?: TiptapDoc | null;

  @IsOptional()
  @IsInt()
  @Min(INACTIVITY_MONTHS_MIN)
  @Max(INACTIVITY_MONTHS_MAX)
  inactivityMonths?: number | null;
}
