import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from "class-validator";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateCustomerDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string | null;

  @IsPhoneNumber(undefined, { message: "Telefone inválido" })
  @IsOptional()
  phone?: string | null;

  @IsString()
  @Matches(DATE_PATTERN, { message: "birthDate must be in YYYY-MM-DD format" })
  @IsOptional()
  birthDate?: string | null;

  @IsIn(["male", "female", "other"])
  @IsOptional()
  gender?: "male" | "female" | "other" | null;

  @IsString()
  @IsOptional()
  address?: string | null;

  @IsString()
  @IsOptional()
  addressLine2?: string | null;

  @IsString()
  @IsOptional()
  city?: string | null;

  @IsString()
  @IsOptional()
  state?: string | null;

  @IsString()
  @IsOptional()
  postalCode?: string | null;

  @IsString()
  @IsOptional()
  country?: string | null;

  @IsString()
  @IsOptional()
  notes?: string | null;

  @IsUUID()
  @IsOptional()
  originId?: string | null;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
