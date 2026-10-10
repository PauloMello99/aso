import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
} from "class-validator";

// Campos multipart chegam como STRING: os Transforms normalizam antes do validate.
function trimString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function normalizePhone({ value }: { value: unknown }): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

function toBoolean({ value }: { value: unknown }): unknown {
  if (value === true || value === "true") return true;
  if (value === false || value === "false" || value === undefined) return false;
  return value;
}

export class SubmitQuoteRequestDto {
  @Transform(trimString)
  @IsString()
  @Length(1, 120)
  name!: string;

  @Transform(normalizePhone)
  @IsString()
  @Matches(/^\+?\d{10,15}$/, { message: "phone must be a valid phone number" })
  phone!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Transform(trimString)
  @IsString()
  @Length(1, 2000)
  idea!: string;

  @IsString()
  @MaxLength(64)
  consentVersion!: string;

  @Transform(toBoolean)
  @IsBoolean()
  privacyConsent!: boolean;

  @Transform(toBoolean)
  @IsBoolean()
  // class-transformer nao roda @Transform para chave AUSENTE: o inicializador
  // garante o default false (consentimento opcional, desmarcado).
  contactRetentionConsent = false;
}
