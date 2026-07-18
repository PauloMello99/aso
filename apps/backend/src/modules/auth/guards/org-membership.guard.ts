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

@Injectable()
export class OrgMembershipGuard implements CanActivate {
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
          eq(schema.orgMemberships.enabled, true),
        ),
      )
      .limit(1);

    if (!membership) {
      if (await isSuperAdmin(this.db, user.id)) return true;
      throw new ForbiddenException(
        "You do not have access to this organization",
      );
    }

    if (
      membership.suspendedAt !== null &&
      membership.platformRole !== "super_admin"
    ) {
      throw new ForbiddenException("This organization is suspended");
    }

    return true;
  }
}
