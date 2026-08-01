import { IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @IsString()
  tokenHash!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
