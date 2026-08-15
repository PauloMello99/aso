import { IsNotEmpty, IsString, Length } from "class-validator";

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  categorySystemKey!: string;

  @IsString()
  @Length(5, 200)
  subject!: string;

  @IsString()
  @Length(10, 5000)
  description!: string;
}
