import { IsArray, IsString } from "class-validator";

export class UpdateMemberPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}
