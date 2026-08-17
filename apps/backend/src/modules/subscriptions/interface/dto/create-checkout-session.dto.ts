import { IsIn, IsOptional } from "class-validator";
import type { BillingInterval } from "../../domain/subscription.entity";

export class CreateCheckoutSessionDto {
  @IsIn(["monthly", "semiannual", "annual"])
  @IsOptional()
  interval?: BillingInterval;
}
