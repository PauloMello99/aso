import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { PAYMENT_METHODS, TRANSACTION_TYPES } from "./create-transaction.dto";
import { MAX_INSTALLMENTS } from "../../domain/fee-calculator";

/**
 * `installments > 1` só é aceito com `paymentMethod = 'credit_card'` (mesmo
 * padrão de `CreateTransactionDto`).
 */
@ValidatorConstraint({
  name: "correctInstallmentsRequiresCreditCard",
  async: false,
})
class InstallmentsRequiresCreditCardConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value === undefined) return true;
    if (typeof value !== "number") return false;
    const paymentMethod = (args.object as CorrectTransactionDto).paymentMethod;
    return value === 1 || paymentMethod === "credit_card";
  }

  defaultMessage(): string {
    return "installments greater than 1 requires paymentMethod credit_card";
  }
}

export class CorrectTransactionDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsIn(TRANSACTION_TYPES)
  type!: (typeof TRANSACTION_TYPES)[number];

  @IsInt()
  @Min(1)
  grossCents!: number;

  @IsIn(PAYMENT_METHODS)
  paymentMethod!: (typeof PAYMENT_METHODS)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INSTALLMENTS)
  @Validate(InstallmentsRequiresCreditCardConstraint)
  installments?: number;

  @IsString()
  @IsOptional()
  transactedAt?: string;
}
