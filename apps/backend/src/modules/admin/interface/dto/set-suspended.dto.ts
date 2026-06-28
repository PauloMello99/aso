import { IsBoolean } from "class-validator";

export class SetSuspendedDto {
  @IsBoolean()
  suspended!: boolean;
}
