import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import type { BillingInterval } from "../../domain/subscription.entity";

export class RotateBillingPlanPriceDto {
  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsIn(["monthly", "semiannual", "annual"])
  @IsOptional()
  interval?: BillingInterval;
}
