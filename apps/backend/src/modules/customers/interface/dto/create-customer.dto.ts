import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Matches,
} from "class-validator";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsPhoneNumber(undefined, { message: "Telefone inválido" })
  @IsOptional()
  phone?: string | null;

  @IsString()
  @Matches(DATE_PATTERN, { message: "birthDate must be in YYYY-MM-DD format" })
  birthDate!: string;

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

  @IsString()
  @IsOptional()
  notes?: string | null;

  @IsUUID()
  @IsOptional()
  originId?: string | null;
}
