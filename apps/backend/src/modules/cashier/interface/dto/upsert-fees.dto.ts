import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { PAYMENT_METHODS } from "./create-transaction.dto";
import { MAX_INSTALLMENTS } from "../../domain/fee-calculator";
import { MAX_AMOUNT_CENTS } from "../../domain/money-limits";

const PERCENT_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * Espelha o CHECK do banco (`org_payment_fees_installments_check`,
 * migration 0074): `installments = 1 OR payment_method = 'credit_card'`.
 */
@ValidatorConstraint({
  name: "orgInstallmentsRequiresCreditCard",
  async: false,
})
class InstallmentsRequiresCreditCardConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== "number") return false;
    const paymentMethod = (args.object as PaymentFeeItemDto).paymentMethod;
    return value === 1 || paymentMethod === "credit_card";
  }

  defaultMessage(): string {
    return "installments greater than 1 requires paymentMethod credit_card";
  }
}

export class PaymentFeeItemDto {
  @IsIn(PAYMENT_METHODS)
  paymentMethod!: (typeof PAYMENT_METHODS)[number];

  @IsString()
  @Matches(PERCENT_PATTERN, { message: "percent must be a non-negative number" })
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

export class UpsertFeesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentFeeItemDto)
  fees!: PaymentFeeItemDto[];
}
