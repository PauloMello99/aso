import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Matches,
  MinLength,
  ValidateIf,
} from "class-validator";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateCustomerDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsNotEmpty()
  @ValidateIf((_, value) => value !== undefined)
  email?: string;

  @IsPhoneNumber(undefined, { message: "Telefone inválido" })
  @IsOptional()
  phone?: string | null;

  @IsString()
  @Matches(DATE_PATTERN, { message: "birthDate must be in YYYY-MM-DD format" })
  @IsNotEmpty()
  @ValidateIf((_, value) => value !== undefined)
  birthDate?: string;

  @IsIn(["male", "female", "other"])
  @IsOptional()
  gender?: "male" | "female" | "other" | null;

  @IsString()
  @IsNotEmpty()
  @ValidateIf((_, value) => value !== undefined)
  address?: string;

  @IsString()
  @IsNotEmpty()
  @ValidateIf((_, value) => value !== undefined)
  number?: string;

  @IsString()
  @IsOptional()
  addressLine2?: string | null;

  @IsString()
  @IsNotEmpty()
  @ValidateIf((_, value) => value !== undefined)
  city?: string;

  @IsString()
  @IsNotEmpty()
  @ValidateIf((_, value) => value !== undefined)
  state?: string;

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
