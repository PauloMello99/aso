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

/**
 * Validação estrutural leve — a validação semântica contra o snapshot de
 * perguntas (tipo, obrigatoriedade, inclusive valor vazio em pergunta
 * opcional) roda no use-case via `validateAnamnesisAnswers`. `@IsDefined()`
 * só garante que a propriedade sobreviva ao `whitelist: true` do
 * ValidationPipe — não usar `@IsNotEmpty()` aqui, que rejeitaria `""` antes
 * do use-case decidir se a pergunta é opcional.
 *
 * `signatureImageBase64` (abaixo, em `SubmitAnamnesisResponseDto`) carrega o
 * `@MaxLength(80_000)` porque este é um endpoint PÚBLICO sem autenticação —
 * o limite de body do Express (~100kb) protege o payload inteiro, não este
 * campo isoladamente, então precisamos de um teto próprio (~80KB de base64
 * cobre um PNG de assinatura em traço fino com folga). O `@Matches` valida o
 * content-type do data URI (só `data:image/png;base64,...` é aceito) — o
 * decode/validação do magic number PNG em si roda no use-case.
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

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  signerFullName!: string;

  // Só dígitos — o frontend remove a máscara antes de enviar.
  @IsOptional()
  @Matches(/^\d{11}$/)
  signerCpf?: string;

  @IsString()
  @Matches(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/)
  @MaxLength(80_000)
  signatureImageBase64!: string;
}
