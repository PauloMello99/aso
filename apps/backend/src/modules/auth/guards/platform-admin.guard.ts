import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Request } from "express";
import { eq } from "drizzle-orm";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../../database/database.module";
import * as schema from "../../../database/schema";
import { AuthUser } from "../application/ports/auth-provider.interface";

/**
 * Autoriza apenas usuários com `platform_role = 'super_admin'` (PLAT-1). Usar
 * após {@link AuthGuard}, em rotas de plataforma (`/admin/**`) que NÃO são
 * org-scoped. Roda antes do RlsInterceptor → usa a conexão privilegiada.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const user = request.user;
    if (!user) throw new ForbiddenException("Not authenticated");

    const [row] = await this.db
      .select({ platformRole: schema.users.platformRole })
      .from(schema.users)
      .where(eq(schema.users.authId, user.id))
      .limit(1);

    if (!row || row.platformRole !== "super_admin") {
      throw new ForbiddenException("Platform admin access required");
    }
    return true;
  }
}
