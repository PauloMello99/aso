import { IsInt, IsOptional, Max, Min } from "class-validator";

export class ApplyDiscountDto {
  @IsInt()
  @Min(1)
  @Max(100)
  percentOff!: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationMonths?: number;
}
