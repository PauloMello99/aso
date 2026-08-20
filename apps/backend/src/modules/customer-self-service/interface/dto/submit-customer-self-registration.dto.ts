import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { AnamnesisAnswerDto } from "../../../anamnesis/interface/dto/submit-anamnesis-response.dto";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Campos cadastrais + anamnese para o cenário 1 (auto-cadastro). Deliberadamente
 * SEM `email` (fixo pelo convite/token — nunca vem do corpo), `orgId`,
 * `serviceTypeId`, `enabled`, `notes` ou `originId` — nenhum desses é preenchível
 * pelo caminho público. Mesmas validações de `CreateCustomerDto` (cadastrais) e
 * `SubmitAnamnesisResponseDto` (anamnese).
 */
export class SubmitCustomerSelfRegistrationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @Matches(DATE_PATTERN, { message: "birthDate must be in YYYY-MM-DD format" })
  birthDate!: string;

  @IsPhoneNumber(undefined, { message: "Telefone inválido" })
  @IsOptional()
  phone?: string | null;

  @IsIn(["male", "female", "other"])
  @IsOptional()
  gender?: "male" | "female" | "other" | null;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsNotEmpty()
  number!: string;

  @IsString()
  @IsOptional()
  addressLine2?: string | null;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;

  @IsString()
  @IsOptional()
  postalCode?: string | null;

  @IsString()
  @IsOptional()
  country?: string | null;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AnamnesisAnswerDto)
  answers!: AnamnesisAnswerDto[];

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  signerFullName!: string;

  @IsOptional()
  @Matches(/^\d{11}$/)
  signerCpf?: string;

  @IsString()
  @Matches(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/)
  @MaxLength(80_000)
  signatureImageBase64!: string;

  @IsBoolean()
  consentAccepted!: boolean;

  @IsString()
  @MinLength(1)
  consentVersion!: string;
}
