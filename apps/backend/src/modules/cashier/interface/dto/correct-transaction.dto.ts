import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { PAYMENT_METHODS, TRANSACTION_TYPES } from "./create-transaction.dto";

/** Novos valores do lançamento corrigido (estorno + relançamento). */
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

  @IsString()
  @IsOptional()
  transactedAt?: string;
}
