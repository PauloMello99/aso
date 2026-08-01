import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
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
  amountCents!: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  transactedAt?: string;
}
