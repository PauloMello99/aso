import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from "class-validator";
import { PAYMENT_METHODS } from "./create-transaction.dto";

const PERCENT_PATTERN = /^\d+(\.\d{1,2})?$/;

export class PaymentFeeItemDto {
  @IsIn(PAYMENT_METHODS)
  paymentMethod!: (typeof PAYMENT_METHODS)[number];

  @IsString()
  @Matches(PERCENT_PATTERN, { message: "percent must be a non-negative number" })
  percent!: string;

  @IsInt()
  @Min(0)
  fixedCents!: number;
}

export class UpsertFeesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentFeeItemDto)
  fees!: PaymentFeeItemDto[];
}
