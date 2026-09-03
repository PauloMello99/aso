import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

export const FEE_ELIGIBLE_PAYMENT_METHODS = [
  "credit_card",
  "debit_card",
] as const;

const PERCENT_PATTERN = /^\d+(\.\d{1,2})?$/;

@ValidatorConstraint({ name: "maxFeePercentValue", async: false })
class MaxPercentValueConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== "string") return false;
    const n = Number(value);
    return Number.isFinite(n) && n <= 100;
  }

  defaultMessage(): string {
    return "percent must not exceed 100";
  }
}

export class MemberFeeItemDto {
  @IsUUID()
  userId!: string;

  @IsIn(FEE_ELIGIBLE_PAYMENT_METHODS)
  paymentMethod!: (typeof FEE_ELIGIBLE_PAYMENT_METHODS)[number];

  @IsString()
  @Matches(PERCENT_PATTERN, { message: "percent must be a non-negative number" })
  @Validate(MaxPercentValueConstraint)
  percent!: string;

  @IsInt()
  @Min(0)
  fixedCents!: number;
}

export class MemberFeeDeactivationDto {
  @IsUUID()
  userId!: string;

  @IsIn(FEE_ELIGIBLE_PAYMENT_METHODS)
  paymentMethod!: (typeof FEE_ELIGIBLE_PAYMENT_METHODS)[number];
}

export class UpsertMemberFeesDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => MemberFeeItemDto)
  fees?: MemberFeeItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => MemberFeeDeactivationDto)
  deactivations?: MemberFeeDeactivationDto[];
}
