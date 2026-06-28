import { IsBoolean } from "class-validator";

export class SetMemberStatusDto {
  @IsBoolean()
  enabled!: boolean;
}
