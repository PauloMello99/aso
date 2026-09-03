import { IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class ListSubscriptionRefundsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
