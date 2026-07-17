import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { SERVICE_PAYMENT_METHODS } from "./create-service.dto";

/** Novos valores do pagamento corrigido (estorno + relançamento). */
export class CorrectServicePaymentDto {
  @IsInt()
  @Min(1)
  grossCents!: number;

  @IsIn(SERVICE_PAYMENT_METHODS)
  paymentMethod!: (typeof SERVICE_PAYMENT_METHODS)[number];

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsISO8601()
  @IsOptional()
  transactedAt?: string;
}
