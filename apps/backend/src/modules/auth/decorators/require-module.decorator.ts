import { SetMetadata } from "@nestjs/common";
import type { ModuleKey } from "../../organizations/domain/member-permissions";

export const REQUIRE_MODULE_KEY = "require_module";

/** Sentinel gravado na mesma metadata key de `@RequireModule` (nunca colide com um `ModuleKey`). */
export const ALLOW_ANY_ORG_MEMBER = "__allow_any_org_member__" as const;

/**
 * Marca o módulo exigido para acessar um controller/rota. Usado pelo
 * {@link OrgModuleGuard}: owner sempre passa; funcionário precisa do módulo nas
 * suas permissões. Ex.: `@RequireModule("cashier")`.
 */
export const RequireModule = (module: ModuleKey) =>
  SetMetadata(REQUIRE_MODULE_KEY, module);

/**
 * Sobrepõe um `@RequireModule` de classe em um handler específico: libera o
 * acesso para qualquer membro **habilitado** da organização, sem exigir flag
 * de módulo (membership/enabled continuam sendo checados pelo
 * {@link OrgModuleGuard}). Usar em leituras de seleção que outro módulo
 * precisa consultar (ex.: listar clientes/materiais para o lançamento de
 * serviço) — nunca em handlers de escrita.
 *
 * Grava o mesmo sentinel na mesma metadata key de `@RequireModule`: o
 * `getAllAndOverride` do guard prioriza o handler sobre a classe.
 */
export const AllowAnyOrgMember = () =>
  SetMetadata(REQUIRE_MODULE_KEY, ALLOW_ANY_ORG_MEMBER);
