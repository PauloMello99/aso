import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";

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

  @IsInt()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @IsBoolean()
  @IsOptional()
  finished?: boolean;
}

export class CreateServiceDto {
  @IsUUID()
  @IsOptional()
  customerId?: string | null;

  @IsUUID()
  serviceTypeId!: string;

  @IsUUID()
  @IsOptional()
  performedBy?: string | null;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsUUID()
  @IsOptional()
  anamnesisResponseId?: string | null;

  @IsInt()
  @Min(0)
  amountCents!: number;

  @IsIn(SERVICE_PAYMENT_METHODS)
  paymentMethod!: (typeof SERVICE_PAYMENT_METHODS)[number];

  @IsIn(SERVICE_PAYMENT_STATUSES)
  paymentStatus!: (typeof SERVICE_PAYMENT_STATUSES)[number];

  @IsString()
  @IsOptional()
  performedAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceMaterialLineDto)
  @ArrayMinSize(1, { message: "Selecione ao menos um material consumido" })
  materials!: ServiceMaterialLineDto[];
}
