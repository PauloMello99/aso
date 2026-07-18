import { IsOptional, IsString, IsUUID } from "class-validator";

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

  @IsUUID()
  @IsOptional()
  anamnesisResponseId?: string | null;

  @IsString()
  @IsOptional()
  performedAt?: string;
}
