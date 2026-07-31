import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";

export class RenameCustomerAttachmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/\S/, { message: "fileName must not be blank" })
  fileName!: string;
}
