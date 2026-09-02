import {
  IsBoolean,
  IsIn,
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
import {
  CAMPAIGN_TRIGGERS,
  type CampaignTrigger,
} from "../../domain/campaign-trigger";

const NAME_MAX_LENGTH = 80;
const SUBJECT_MAX_LENGTH = 200;
const INACTIVITY_MONTHS_MIN = 1;
const INACTIVITY_MONTHS_MAX = 36;

/**
 * Payload do `POST /orgs/:orgId/campaigns` (T6 rework, Fatia 7).
 *
 * `body` é um documento Tiptap-JSON validado FORTE no use-case (o walker
 * `validateCampaignBody`, Fatia 3) — aqui só `@IsObject()`, SEM
 * `@ValidateNested`/`@Type`: o `ValidationPipe` global roda `whitelist: true` e
 * decorar o aninhado faria o `class-transformer` PODAR o interior do doc.
 * Os tetos casam com os CHECKs do banco: `@MaxLength(80)` em `name` casa com
 * `campaigns_name_check` (`btrim` 1..80), `@MaxLength(200)` em `subject` casa com
 * `campaigns_subject_check`. `inactivityMonths` só é exigido/aceito para o
 * gatilho `inactivity` (CHECK `campaigns_inactivity_months_check`); fora dele o
 * use-case ignora o valor recebido.
 */
export class CreateCampaignDto {
  @IsIn(CAMPAIGN_TRIGGERS)
  trigger!: CampaignTrigger;

  @IsString()
  @MinLength(1)
  @MaxLength(NAME_MAX_LENGTH)
  @Matches(/\S/, { message: "name must contain a non-whitespace character" })
  name!: string;

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

  @ValidateIf((o: CreateCampaignDto) => o.trigger === "inactivity")
  @IsInt()
  @Min(INACTIVITY_MONTHS_MIN)
  @Max(INACTIVITY_MONTHS_MAX)
  inactivityMonths?: number;
}
