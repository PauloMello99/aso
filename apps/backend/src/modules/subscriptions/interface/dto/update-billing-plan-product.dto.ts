import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";

export class UpdateBillingPlanProductDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, string>;

  @IsBoolean()
  @IsOptional()
  highlighted?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];
}
