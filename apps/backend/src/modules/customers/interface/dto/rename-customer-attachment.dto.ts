import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";

export class RenameCustomerAttachmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/\S/, { message: "baseName must not be blank" })
  // eslint-disable-next-line no-control-regex -- intencional: bloqueia caracteres de controle no nome
  @Matches(/^[^/\\\x00-\x1f]+$/, {
    message: "baseName must not contain path separators or control characters",
  })
  baseName!: string;
}
