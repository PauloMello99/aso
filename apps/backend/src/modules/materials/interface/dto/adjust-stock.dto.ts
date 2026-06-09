import { IsOptional, IsString, Matches } from "class-validator";

export class AdjustStockDto {
  /** Positive to add stock, negative to subtract (e.g. "10.00" or "-5.50") */
  @IsString()
  @Matches(/^-?\d+(\.\d{1,2})?$/, {
    message: "quantityDelta must be a number (e.g. '10' or '-5.5')",
  })
  quantityDelta!: string;

  @IsString()
  @IsOptional()
  note?: string | null;
}

