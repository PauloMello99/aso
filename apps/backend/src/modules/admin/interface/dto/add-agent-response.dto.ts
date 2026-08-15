import { IsBoolean, IsOptional, IsString, Length } from "class-validator";

export class AddAgentResponseDto {
  @IsString()
  @Length(1, 5000)
  body!: string;

  @IsOptional()
  @IsBoolean()
  isInternalNote?: boolean;
}
