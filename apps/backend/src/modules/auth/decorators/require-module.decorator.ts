import { SetMetadata } from "@nestjs/common";
import type { ModuleKey } from "../../organizations/domain/member-permissions";

export const REQUIRE_MODULE_KEY = "require_module";

/**
 * Marca o módulo exigido para acessar um controller/rota. Usado pelo
 * {@link OrgModuleGuard}: owner sempre passa; funcionário precisa do módulo nas
 * suas permissões. Ex.: `@RequireModule("cashier")`.
 */
export const RequireModule = (module: ModuleKey) =>
  SetMetadata(REQUIRE_MODULE_KEY, module);
