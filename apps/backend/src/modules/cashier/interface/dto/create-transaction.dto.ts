import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { MAX_INSTALLMENTS } from "../../domain/fee-calculator";
import { MAX_AMOUNT_CENTS } from "../../domain/money-limits";

export const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "credit_card",
  "debit_card",
] as const;

export const TRANSACTION_TYPES = ["income", "outcome"] as const;

/**
 * `installments > 1` só é aceito com `paymentMethod = 'credit_card'` (mesmo
 * estilo de `upsert-fees.dto.ts`/`upsert-member-fees.dto.ts`, passo 8).
 * O CHECK do banco (`transactions_installments_check`, migration 0075) é mais
 * estrito — exige `installments IS NULL` para métodos não-crédito — mas essa
 * normalização (1 → null fora do crédito) é feita por
 * `normalizeInstallments` no use-case, não neste DTO.
 */
@ValidatorConstraint({
  name: "installmentsRequiresCreditCard",
  async: false,
})
class InstallmentsRequiresCreditCardConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value === undefined) return true;
    if (typeof value !== "number") return false;
    const paymentMethod = (args.object as CreateTransactionDto).paymentMethod;
    return value === 1 || paymentMethod === "credit_card";
  }

  defaultMessage(): string {
    return "installments greater than 1 requires paymentMethod credit_card";
  }
}

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsIn(TRANSACTION_TYPES)
  type!: (typeof TRANSACTION_TYPES)[number];

  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT_CENTS)
  grossCents!: number;

  @IsIn(PAYMENT_METHODS)
  paymentMethod!: (typeof PAYMENT_METHODS)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INSTALLMENTS)
  @Validate(InstallmentsRequiresCreditCardConstraint)
  installments?: number;

  @IsUUID()
  @IsOptional()
  categoryId?: string | null;

  @IsUUID()
  @IsOptional()
  createdBy?: string | null;

  @IsString()
  @IsOptional()
  transactedAt?: string;
}
