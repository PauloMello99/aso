import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { PAYMENT_METHODS } from "./create-transaction.dto";

export class TransferDto {
  @IsIn(PAYMENT_METHODS)
  fromMethod!: (typeof PAYMENT_METHODS)[number];

  @IsIn(PAYMENT_METHODS)
  toMethod!: (typeof PAYMENT_METHODS)[number];

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  transactedAt?: string;
}
