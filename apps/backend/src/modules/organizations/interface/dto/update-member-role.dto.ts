import { IsEnum } from "class-validator";

export class UpdateMemberRoleDto {
  @IsEnum(["owner", "employee"], {
    message: "role must be owner or employee",
  })
  role!: "owner" | "employee";
}
