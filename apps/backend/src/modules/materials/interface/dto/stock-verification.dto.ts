import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateNested,
} from "class-validator";

const NUMERIC = /^-?\d+(\.\d{1,2})?$/;

export class SetStockIntervalDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  intervalDays?: number | null;
}

export class VerificationItemDto {
  @IsUUID()
  materialId!: string;

  @IsString()
  @Matches(NUMERIC, { message: "physicalQuantity inválida" })
  physicalQuantity!: string;
}

export class CreateVerificationDto {
  @IsString()
  @IsOptional()
  note?: string;

  @IsBoolean()
  @IsOptional()
  reconcile?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VerificationItemDto)
  items!: VerificationItemDto[];
}
