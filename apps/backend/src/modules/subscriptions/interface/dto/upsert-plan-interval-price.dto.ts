import { IsIn, IsInt, IsString, Min } from "class-validator";
import type { BillingInterval } from "../../domain/subscription.entity";

export class UpsertPlanIntervalPriceDto {
  @IsIn(["monthly", "semiannual", "annual"])
  interval!: BillingInterval;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsString()
  currency!: string;
}
