import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { MAX_AMOUNT_CENTS } from "../../domain/money-limits";
import { PAYMENT_METHODS } from "./create-transaction.dto";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Data de calendario REAL (o regex sozinho aceita 2026-13-45, que o Postgres
// rejeita com 500 na insercao). Roundtrip via Date.UTC: 2026-02-30 vira 03-02
// e nao bate com a entrada. Valores nao-string/fora do formato retornam true
// aqui — o @IsString/@Matches ja reporta esses casos.
function isRealCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return true;
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

@ValidatorConstraint({ name: "realCalendarDate", async: false })
class RealCalendarDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value !== "string" || isRealCalendarDate(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid calendar date`;
  }
}

// periodStart <= periodEnd (CHECK org_member_payments_period_check). Roda em
// periodEnd; so compara quando os dois sao strings de data validas — os
// demais casos ja sao reportados pelos validadores de cada campo. YYYY-MM-DD
// ordena lexicograficamente igual a cronologicamente.
@ValidatorConstraint({ name: "periodEndNotBeforeStart", async: false })
class PeriodEndNotBeforeStartConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const start = (args.object as { periodStart?: unknown }).periodStart;
    if (typeof value !== "string" || typeof start !== "string") return true;
    if (!DATE_PATTERN.test(value) || !DATE_PATTERN.test(start)) return true;
    if (!isRealCalendarDate(value) || !isRealCalendarDate(start)) return true;
    return start <= value;
  }

  defaultMessage(): string {
    return "periodEnd must not be before periodStart";
  }
}

// Reusado tambem em POST .../payments/:paymentId/correct: os campos de
// CorrectMemberPaymentInput sao identicos aos de CreateMemberPaymentInput
// (menos userId, que sempre vem do path/da linha original, nunca do body) —
// nao ha campo exclusivo de nenhum dos dois lados que justifique uma classe
// separada (diferente do par CreateTransactionDto/CorrectTransactionDto, que
// divergem em `type`).
export class CreateMemberPaymentDto {
  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT_CENTS)
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
  @Validate(RealCalendarDateConstraint)
  periodStart?: string;

  @IsString()
  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: "periodEnd must be in YYYY-MM-DD format",
  })
  @Validate(RealCalendarDateConstraint)
  @Validate(PeriodEndNotBeforeStartConstraint)
  periodEnd?: string;
}
