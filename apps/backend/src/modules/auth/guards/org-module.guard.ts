import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { and, eq } from "drizzle-orm";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../../database/database.module";
import * as schema from "../../../database/schema";
import { AuthUser } from "../application/ports/auth-provider.interface";
import {
  hasModuleAccess,
  type ModuleKey,
} from "../../organizations/domain/member-permissions";
import { REQUIRE_MODULE_KEY } from "../decorators/require-module.decorator";

/**
 * Autoriza acesso a um **módulo** da org: owner sempre passa; funcionário precisa
 * do módulo nas suas permissões (PERM-1). O módulo vem do `@RequireModule(...)`.
 * Usar após {@link AuthGuard} e {@link OrgMembershipGuard}.
 */
@Injectable()
export class OrgModuleGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<ModuleKey | undefined>(
      REQUIRE_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Sem módulo exigido → nada a checar aqui (membership já garante acesso).
    if (!required) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const user = request.user;
    const orgId = request.params?.orgId;
    if (!user) throw new ForbiddenException("Not authenticated");
    if (typeof orgId !== "string" || !orgId) {
      throw new ForbiddenException("Missing organization context");
    }

    const [row] = await this.db
      .select({
        role: schema.orgMemberships.role,
        permissions: schema.orgMemberships.permissions,
      })
      .from(schema.orgMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.orgMemberships.userId))
      .where(
        and(
          eq(schema.orgMemberships.orgId, orgId),
          eq(schema.users.authId, user.id),
          eq(schema.orgMemberships.enabled, true),
        ),
      )
      .limit(1);

    if (!row) {
      throw new ForbiddenException("You do not have access to this organization");
    }

    const role = row.role as "owner" | "employee";
    if (!hasModuleAccess(role, row.permissions ?? [], required)) {
      throw new ForbiddenException(
        "You do not have permission to access this module",
      );
    }
    return true;
  }
}
