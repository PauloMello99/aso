import { IsOptional, IsString, IsUUID } from "class-validator";

/** Apenas campos não-financeiros. Valor/método/estoque exigem cancelar + recriar. */
export class UpdateServiceDto {
  @IsUUID()
  @IsOptional()
  customerId?: string | null;

  @IsUUID()
  @IsOptional()
  serviceTypeId?: string | null;

  @IsUUID()
  @IsOptional()
  performedBy?: string | null;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsString()
  @IsOptional()
  performedAt?: string;
}
