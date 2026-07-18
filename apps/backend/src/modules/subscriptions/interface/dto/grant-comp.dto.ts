import { IsISO8601, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class GrantCompDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsISO8601()
  @IsOptional()
  expiresAt?: string;
}
