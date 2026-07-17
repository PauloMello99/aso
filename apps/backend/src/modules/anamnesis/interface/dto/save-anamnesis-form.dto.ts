import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { QUESTION_TYPES } from "../../domain/anamnesis-question";

export class AnamnesisQuestionDto {
  @IsUUID()
  id!: string;

  @IsIn(QUESTION_TYPES)
  type!: (typeof QUESTION_TYPES)[number];

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  label!: string;

  @IsBoolean()
  required!: boolean;
}

export class SaveAnamnesisFormDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AnamnesisQuestionDto)
  questions!: AnamnesisQuestionDto[];
}
