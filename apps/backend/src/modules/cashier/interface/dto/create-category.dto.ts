import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(/\S/, { message: "name must not be blank" })
  name!: string;
}
