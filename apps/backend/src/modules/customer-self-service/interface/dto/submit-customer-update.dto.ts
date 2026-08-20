import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  ValidateIf,
} from "class-validator";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Cenário 3 (atualização cadastral): mesma whitelist de campos cadastrais de
 * `SubmitCustomerSelfRegistrationDto`, todos opcionais (só os campos enviados são
 * alterados), incluindo `email` — decisão de produto (backlog P-2, cenário 3):
 * o cliente pode atualizar endereço, telefone e e-mail via este formulário.
 * `SubmitCustomerUpdateUseCase` já faz a checagem de conflito de e-mail
 * (`findByEmailInOrg` com `excludeId`) quando o valor difere do atual. Sem campos
 * de anamnese.
 */
export class SubmitCustomerUpdateDto {
  @IsString()
  @IsNotEmpty()
  @ValidateIf((_, value) => value !== undefined)
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @Matches(DATE_PATTERN, { message: "birthDate must be in YYYY-MM-DD format" })
  @IsNotEmpty()
  @ValidateIf((_, value) => value !== undefined)
  birthDate?: string;

  @IsPhoneNumber(undefined, { message: "Telefone inválido" })
  @IsOptional()
  phone?: string | null;

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
}
