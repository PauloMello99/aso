import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";

export const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "credit_card",
  "debit_card",
] as const;

export const TRANSACTION_TYPES = ["income", "outcome"] as const;

export class CreateTransactionDto {
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
