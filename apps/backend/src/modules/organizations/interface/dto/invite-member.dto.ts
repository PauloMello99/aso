import { IsEmail, IsEnum } from "class-validator";

export class InviteMemberDto {
  @IsEmail({}, { message: "email must be a valid email address" })
  email!: string;

  @IsEnum(["owner", "employee"], {
    message: "role must be owner or employee",
  })
  role!: "owner" | "employee";
}
