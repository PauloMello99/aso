import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from "class-validator";
import { PAYMENT_METHODS } from "./create-transaction.dto";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Reusado tambem em POST .../payments/:paymentId/correct: os campos de
// CorrectMemberPaymentInput sao identicos aos de CreateMemberPaymentInput
// (menos userId, que sempre vem do path/da linha original, nunca do body) —
// nao ha campo exclusivo de nenhum dos dois lados que justifique uma classe
// separada (diferente do par CreateTransactionDto/CorrectTransactionDto, que
// divergem em `type`).
export class CreateMemberPaymentDto {
  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsIn(PAYMENT_METHODS)
  paymentMethod!: (typeof PAYMENT_METHODS)[number];

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  // Coluna date(...) sem `{ mode: "date" }` (YYYY-MM-DD) — ver comentario em
  // member-payment.entity.ts. Nunca parseado com `new Date(...)` no
  // controller: isso deslocaria um dia em fusos negativos (Brasil = UTC-3).
  @IsString()
  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: "periodStart must be in YYYY-MM-DD format",
  })
  periodStart?: string;

  @IsString()
  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: "periodEnd must be in YYYY-MM-DD format",
  })
  periodEnd?: string;
}
