import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateServiceTypeDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsBoolean()
  @IsOptional()
  requiresAgeVerification?: boolean;
}
