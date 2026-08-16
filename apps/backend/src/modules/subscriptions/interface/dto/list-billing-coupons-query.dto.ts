import { IsBoolean, IsOptional } from "class-validator";
import { Transform } from "class-transformer";

export class ListBillingCouponsQueryDto {
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === true || value === "true",
  )
  @IsBoolean()
  active?: boolean;
}
