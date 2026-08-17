import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class RotatePlanIntervalPriceDto {
  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsString()
  @IsOptional()
  currency?: string;
}
