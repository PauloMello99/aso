import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { MAX_INSTALLMENTS } from "../../domain/fee-calculator";
import { MAX_AMOUNT_CENTS } from "../../domain/money-limits";

export const FEE_ELIGIBLE_PAYMENT_METHODS = [
  "credit_card",
  "debit_card",
] as const;

const PERCENT_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * Cap de rede de segurança: 13 combinações por membro (12 faixas de crédito
 * + débito à vista) × N membros. A UI (passo 19) envia só deltas, não a
 * matriz inteira — este número não é o caminho normal, é o teto do payload
 * no caso de a UI enviar tudo mesmo assim (~153 membros a 13 combinações).
 * Elevado de 200 (que estourava a partir de ~16 membros).
 */
const MAX_MEMBER_FEE_ITEMS = 2000;

@ValidatorConstraint({ name: "maxFeePercentValue", async: false })
class MaxPercentValueConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== "string") return false;
    const n = Number(value);
    return Number.isFinite(n) && n <= 100;
  }

  defaultMessage(): string {
    return "percent must not exceed 100";
  }
}

/**
 * Espelha o CHECK do banco (`org_member_payment_fees_installments_check`,
 * migration 0074): `installments = 1 OR payment_method = 'credit_card'`.
 */
@ValidatorConstraint({
  name: "memberInstallmentsRequiresCreditCard",
  async: false,
})
class InstallmentsRequiresCreditCardConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== "number") return false;
    const paymentMethod = (
      args.object as MemberFeeItemDto | MemberFeeDeactivationDto
    ).paymentMethod;
    return value === 1 || paymentMethod === "credit_card";
  }

  defaultMessage(): string {
    return "installments greater than 1 requires paymentMethod credit_card";
  }
}

export class MemberFeeItemDto {
  @IsUUID()
  userId!: string;

  @IsIn(FEE_ELIGIBLE_PAYMENT_METHODS)
  paymentMethod!: (typeof FEE_ELIGIBLE_PAYMENT_METHODS)[number];

  @IsString()
  @Matches(PERCENT_PATTERN, { message: "percent must be a non-negative number" })
  @Validate(MaxPercentValueConstraint)
  percent!: string;

  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT_CENTS)
  fixedCents!: number;

  @IsInt()
  @Min(1)
  @Max(MAX_INSTALLMENTS)
  @Validate(InstallmentsRequiresCreditCardConstraint)
  installments!: number;
}

export class MemberFeeDeactivationDto {
  @IsUUID()
  userId!: string;

  @IsIn(FEE_ELIGIBLE_PAYMENT_METHODS)
  paymentMethod!: (typeof FEE_ELIGIBLE_PAYMENT_METHODS)[number];

  @IsInt()
  @Min(1)
  @Max(MAX_INSTALLMENTS)
  @Validate(InstallmentsRequiresCreditCardConstraint)
  installments!: number;
}

export class UpsertMemberFeesDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_MEMBER_FEE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => MemberFeeItemDto)
  fees?: MemberFeeItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_MEMBER_FEE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => MemberFeeDeactivationDto)
  deactivations?: MemberFeeDeactivationDto[];
}
