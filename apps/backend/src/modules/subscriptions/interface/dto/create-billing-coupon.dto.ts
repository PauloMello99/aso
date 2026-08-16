import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class CreateBillingCouponDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  percentOff?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  amountOffCents?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsIn(["once", "repeating", "forever"])
  duration!: "once" | "repeating" | "forever";

  @IsInt()
  @Min(1)
  @IsOptional()
  durationInMonths?: number;

  @IsString()
  @IsOptional()
  code?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxRedemptions?: number;

  @IsISO8601()
  @IsOptional()
  expiresAt?: string;
}
