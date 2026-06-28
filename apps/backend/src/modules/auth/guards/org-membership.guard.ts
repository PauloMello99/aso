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
import { AuthUser } from "../application/ports/auth-provider.interface";

/**
 * Authorizes that the authenticated user belongs to the `:orgId` in the route.
 *
 * Must run AFTER {@link AuthGuard} (which populates `request.user`):
 *   `@UseGuards(AuthGuard, OrgMembershipGuard)`
 *
 * Apply to every org-scoped resource controller (materials, customers, …) so a
 * valid token for one org cannot read/write another org's data. Returns 403 if
 * the user is not a member of the org.
 */
@Injectable()
export class OrgMembershipGuard implements CanActivate {
  // Guards run BEFORE the RlsInterceptor sets request claims, so this query
  // must use the privileged connection. It already enforces isolation itself
  // by filtering on the authenticated user's id.
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const user = request.user;
    const orgId = request.params?.orgId;

    if (!user) {
      throw new ForbiddenException("Not authenticated");
    }
    if (typeof orgId !== "string" || !orgId) {
      throw new ForbiddenException("Missing organization context");
    }

    const [membership] = await this.db
      .select({
        id: schema.orgMemberships.id,
        platformRole: schema.users.platformRole,
        suspendedAt: schema.organizations.suspendedAt,
      })
      .from(schema.orgMemberships)
      .innerJoin(
        schema.users,
        eq(schema.users.id, schema.orgMemberships.userId),
      )
      .innerJoin(
        schema.organizations,
        eq(schema.organizations.id, schema.orgMemberships.orgId),
      )
      .where(
        and(
          eq(schema.orgMemberships.orgId, orgId),
          eq(schema.users.authId, user.id),
          // Membro inativo perde acesso à org.
          eq(schema.orgMemberships.enabled, true),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new ForbiddenException(
        "You do not have access to this organization",
      );
    }

    // Org suspensa pelo super_admin (PLAT-1): bloqueia todos menos super_admin.
    if (
      membership.suspendedAt !== null &&
      membership.platformRole !== "super_admin"
    ) {
      throw new ForbiddenException("This organization is suspended");
    }

    return true;
  }
}
