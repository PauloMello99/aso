import { IsEmail, IsNotEmpty, IsString, Length } from "class-validator";

export class CreatePublicTicketDto {
  @IsString()
  @Length(2, 120)
  requesterName!: string;

  @IsEmail()
  requesterEmail!: string;

  @IsString()
  @Length(5, 200)
  subject!: string;

  @IsString()
  @Length(10, 5000)
  description!: string;

  @IsString()
  @IsNotEmpty()
  categorySystemKey!: string;

  @IsString()
  @IsNotEmpty()
  turnstileToken!: string;
}
