import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Request } from "express";
import { and, eq } from "drizzle-orm";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../../database/database.module";
import * as schema from "../../../database/schema";
import { isSuperAdmin } from "../../../common/auth/is-super-admin";
import { AuthUser } from "../application/ports/auth-provider.interface";

/**
 * Autoriza apenas **owner** (ou super_admin) da `:orgId` da rota. Usar após
 * {@link AuthGuard}. Ex.: módulo de Caixa — "funcionário não tem acesso ao caixa".
 * Roda antes do RlsInterceptor → usa a conexão privilegiada (filtra pelo usuário).
 */
@Injectable()
export class OrgOwnerGuard implements CanActivate {
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
      .select({ id: schema.orgMemberships.id })
      .from(schema.orgMemberships)
      .innerJoin(
        schema.users,
        eq(schema.users.id, schema.orgMemberships.userId),
      )
      .where(
        and(
          eq(schema.orgMemberships.orgId, orgId),
          eq(schema.users.authId, user.id),
          eq(schema.orgMemberships.role, "owner"),
          eq(schema.orgMemberships.enabled, true),
        ),
      )
      .limit(1);

    if (!row) {
      // super_admin age como owner em qualquer org.
      if (await isSuperAdmin(this.db, user.id)) return true;
      throw new ForbiddenException(
        "Only organization owners can access this resource",
      );
    }
    return true;
  }
}
