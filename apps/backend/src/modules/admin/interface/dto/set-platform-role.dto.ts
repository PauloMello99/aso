import { IsIn } from "class-validator";

export const PLATFORM_ROLES = ["super_admin", "user"] as const;

export class SetPlatformRoleDto {
  @IsIn(PLATFORM_ROLES)
  role!: (typeof PLATFORM_ROLES)[number];
}
