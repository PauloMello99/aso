import { SetMetadata } from "@nestjs/common";
import type { ModuleKey } from "../../organizations/domain/member-permissions";

export const REQUIRE_MODULE_KEY = "require_module";

export const ALLOW_ANY_ORG_MEMBER = "__allow_any_org_member__" as const;

export const RequireModule = (module: ModuleKey) =>
  SetMetadata(REQUIRE_MODULE_KEY, module);

export const AllowAnyOrgMember = () =>
  SetMetadata(REQUIRE_MODULE_KEY, ALLOW_ANY_ORG_MEMBER);
