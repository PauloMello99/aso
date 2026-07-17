import {
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateMeDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string | null;

  @IsOptional()
  @IsISO8601()
  onboardingCompletedAt?: string | null;
}
