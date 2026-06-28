import { IsArray, IsString } from "class-validator";

export class UpdateMemberPermissionsDto {
  /** Chaves de módulo liberadas ao funcionário (ver member-permissions). */
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}
