import { IsBoolean } from "class-validator";

export class SetPlanIntervalActiveDto {
  @IsBoolean()
  active!: boolean;
}
