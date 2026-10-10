import { Transform } from "class-transformer";
import { IsBoolean, IsString, Length, MaxLength } from "class-validator";

export class UpsertMyQuoteFormDto {
  @IsString()
  @MaxLength(40)
  slug!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @Length(1, 80)
  displayName!: string;

  @IsBoolean()
  enabled!: boolean;
}
