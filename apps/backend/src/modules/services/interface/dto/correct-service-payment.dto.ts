import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { SERVICE_PAYMENT_METHODS } from "./create-service.dto";
import { MAX_INSTALLMENTS } from "../../../cashier/domain/fee-calculator";
import { MAX_AMOUNT_CENTS } from "../../../cashier/domain/money-limits";

/**
 * `installments > 1` só é aceito com `paymentMethod = 'credit_card'` (mesmo
 * padrão de `CreateServiceDto`/`CorrectTransactionDto`).
 */
@ValidatorConstraint({
  name: "correctServiceInstallmentsRequiresCreditCard",
  async: false,
})
class InstallmentsRequiresCreditCardConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value === undefined) return true;
    if (typeof value !== "number") return false;
    const paymentMethod = (args.object as CorrectServicePaymentDto)
      .paymentMethod;
    return value === 1 || paymentMethod === "credit_card";
  }

  defaultMessage(): string {
    return "installments greater than 1 requires paymentMethod credit_card";
  }
}

export class CorrectServicePaymentDto {
  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT_CENTS)
  grossCents!: number;

  @IsIn(SERVICE_PAYMENT_METHODS)
  paymentMethod!: (typeof SERVICE_PAYMENT_METHODS)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INSTALLMENTS)
  @Validate(InstallmentsRequiresCreditCardConstraint)
  installments?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsISO8601()
  @IsOptional()
  transactedAt?: string;
}
