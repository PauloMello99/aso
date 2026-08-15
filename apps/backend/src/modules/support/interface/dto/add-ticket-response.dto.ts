import { IsString, Length } from "class-validator";

export class AddTicketResponseDto {
  @IsString()
  @Length(1, 5000)
  body!: string;
}
