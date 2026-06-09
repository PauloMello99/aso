import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from "class-validator";

const NUMERIC_PATTERN = /^\d+(\.\d{1,2})?$/;

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string | null;

  @IsString()
  @IsOptional()
  unit?: string | null;

  @IsString()
  @Matches(NUMERIC_PATTERN, { message: "minimumQuantity must be a positive number" })
  @IsOptional()
  minimumQuantity?: string;

  @IsString()
  @Matches(NUMERIC_PATTERN, { message: "costPerUnit must be a positive number" })
  @IsOptional()
  costPerUnit?: string | null;
}

