import { IsOptional, IsString, Matches } from "class-validator";

export class RestockMaterialDto {
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: "quantity must be a positive number",
  })
  quantity!: string;

  @IsString()
  @IsOptional()
  note?: string | null;
}

