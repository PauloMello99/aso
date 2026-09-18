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
  Max,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidateNested,
} from "class-validator";
import { MAX_INSTALLMENTS } from "../../../cashier/domain/fee-calculator";

export const SERVICE_PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "credit_card",
  "debit_card",
] as const;

export const SERVICE_PAYMENT_STATUSES = ["paid", "pending"] as const;

/**
 * `installments > 1` só é aceito com `paymentMethod = 'credit_card'` (mesmo
 * estilo de `create-transaction.dto.ts`/`upsert-fees.dto.ts`, Bloco 3). O
 * CHECK do banco (`services_installments_check`, migration 0074) é mais
 * estrito — exige `installments IS NULL` para métodos não-crédito — mas essa
 * normalização (1 → null fora do crédito) é feita por `normalizeInstallments`
 * no use-case, não neste DTO.
 */
@ValidatorConstraint({
  name: "serviceInstallmentsRequiresCreditCard",
  async: false,
})
class InstallmentsRequiresCreditCardConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value === undefined) return true;
    if (typeof value !== "number") return false;
    const paymentMethod = (args.object as CreateServiceDto).paymentMethod;
    return value === 1 || paymentMethod === "credit_card";
  }

  defaultMessage(): string {
    return "installments greater than 1 requires paymentMethod credit_card";
  }
}

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

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INSTALLMENTS)
  @Validate(InstallmentsRequiresCreditCardConstraint)
  installments?: number;

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
