import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

const SUBJECT_MAX_LENGTH = 200;
const BODY_MAX_LENGTH = 5000;

/**
 * Payload do `PUT /orgs/:orgId/campaign-settings` (T6 Bloco B, F1).
 *
 * Os 6 campos de texto são opcionais e aceitam ausência ou `""` — o use-case
 * normaliza (`trim()`; vazio -> `null`). `@MaxLength` casa com o CHECK do banco
 * (migration 0062): 200 para subject, 5000 para body.
 */
export class UpsertOrgCampaignSettingsDto {
  @IsBoolean()
  postServiceEnabled!: boolean;

  @IsBoolean()
  birthdayEnabled!: boolean;

  @IsBoolean()
  inactivityEnabled!: boolean;

  @IsInt()
  @Min(1)
  @Max(36)
  inactivityMonths!: number;

  @IsOptional()
  @IsString()
  @MaxLength(SUBJECT_MAX_LENGTH)
  postServiceSubject?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(BODY_MAX_LENGTH)
  postServiceBody?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(SUBJECT_MAX_LENGTH)
  birthdaySubject?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(BODY_MAX_LENGTH)
  birthdayBody?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(SUBJECT_MAX_LENGTH)
  inactivitySubject?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(BODY_MAX_LENGTH)
  inactivityBody?: string | null;
}
