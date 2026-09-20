import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { MAX_AMOUNT_CENTS } from "../../domain/money-limits";
import {
  TRANSFER_METHODS,
  TransferMethod,
} from "../../domain/transaction.entity";

export { TRANSFER_METHODS };

export class TransferDto {
  @IsIn(TRANSFER_METHODS)
  fromMethod!: TransferMethod;

  @IsIn(TRANSFER_METHODS)
  toMethod!: TransferMethod;

  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT_CENTS)
  amountCents!: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  transactedAt?: string;
}
