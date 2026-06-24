import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";

// Créditos ficam fora da V1 (cashback adiado) — só métodos do caixa.
export const SERVICE_PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "credit_card",
  "debit_card",
] as const;

export const SERVICE_PAYMENT_STATUSES = ["paid", "pending"] as const;

export class ServiceMaterialLineDto {
  @IsUUID()
  materialId!: string;

  /** Quantidade (material não-compartilhável). */
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  /** "Acabou?" para material compartilhável. */
  @IsBoolean()
  @IsOptional()
  finished?: boolean;
}

export class CreateServiceDto {
  @IsUUID()
  @IsOptional()
  customerId?: string | null;

  @IsUUID()
  @IsOptional()
  serviceTypeId?: string | null;

  /** App users.id do profissional (só owner; funcionário força = self). */
  @IsUUID()
  @IsOptional()
  performedBy?: string | null;

  @IsString()
  @IsOptional()
  description?: string | null;

  /** Valor bruto em centavos. */
  @IsInt()
  @Min(0)
  amountCents!: number;

  @IsIn(SERVICE_PAYMENT_METHODS)
  paymentMethod!: (typeof SERVICE_PAYMENT_METHODS)[number];

  @IsIn(SERVICE_PAYMENT_STATUSES)
  paymentStatus!: (typeof SERVICE_PAYMENT_STATUSES)[number];

  /** ISO datetime opcional; default = agora. */
  @IsString()
  @IsOptional()
  performedAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceMaterialLineDto)
  @IsOptional()
  materials?: ServiceMaterialLineDto[];
}
