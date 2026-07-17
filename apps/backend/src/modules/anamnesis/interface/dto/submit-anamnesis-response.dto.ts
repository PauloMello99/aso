import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
  IsUUID,
  ValidateNested,
} from "class-validator";

/**
 * Validação estrutural leve — a validação semântica contra o snapshot de
 * perguntas (tipo, obrigatoriedade, inclusive valor vazio em pergunta
 * opcional) roda no use-case via `validateAnamnesisAnswers`. `@IsDefined()`
 * só garante que a propriedade sobreviva ao `whitelist: true` do
 * ValidationPipe — não usar `@IsNotEmpty()` aqui, que rejeitaria `""` antes
 * do use-case decidir se a pergunta é opcional.
 */
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
}
