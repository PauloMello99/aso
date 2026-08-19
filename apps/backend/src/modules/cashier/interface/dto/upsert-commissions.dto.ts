import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from "class-validator";

export const COMMISSION_MODES = ["gross", "net"] as const;

const PERCENT_PATTERN = /^\d+(\.\d{1,2})?$/;

@ValidatorConstraint({ name: "maxPercentValue", async: false })
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

export class MemberCommissionItemDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @Matches(PERCENT_PATTERN, { message: "percent must be a non-negative number" })
  @Validate(MaxPercentValueConstraint)
  percent!: string;

  @IsIn(COMMISSION_MODES)
  mode!: (typeof COMMISSION_MODES)[number];
}

export class UpsertCommissionsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => MemberCommissionItemDto)
  commissions!: MemberCommissionItemDto[];
}
