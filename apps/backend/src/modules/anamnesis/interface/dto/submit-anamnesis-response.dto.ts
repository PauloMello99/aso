import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export class AnamnesisAnswerDto {
  @IsUUID()
  questionId!: string;

  @IsDefined()
  value!: string | boolean;
}

export class SubmitAnamnesisResponseDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AnamnesisAnswerDto)
  answers!: AnamnesisAnswerDto[];

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  signerFullName!: string;

  @IsOptional()
  @Matches(/^\d{11}$/)
  signerCpf?: string;

  @IsString()
  @Matches(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/)
  @MaxLength(80_000)
  signatureImageBase64!: string;
}
