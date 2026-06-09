import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class CreateOrgDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}
