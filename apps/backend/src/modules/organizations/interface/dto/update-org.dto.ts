import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateOrgDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(80)
  name?: string;
}
