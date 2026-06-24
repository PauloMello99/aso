import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request } from "express";
import { Observable, from, firstValueFrom } from "rxjs";
import { RlsContext } from "../../database/database.module";
import type { AuthUser } from "../../modules/auth/application/ports/auth-provider.interface";

/**
 * Runs each authenticated request's handler inside an RLS context: the
 * {@link RlsContext} opens a transaction on the `app_user` (NOBYPASSRLS)
 * connection with `request.jwt.claims` set to the caller's auth id, so the
 * RLS policies from migration 0000 enforce org isolation at the DB layer
 * (defense-in-depth alongside the app-layer guards).
 *
 * Public routes (no `request.user`, set by {@link AuthGuard}) pass through
 * untouched. Guards run before interceptors, so guard-time queries and the
 * bootstrap flows (sign-up, create-org) deliberately use {@link DRIZZLE_ADMIN}.
 */
@Injectable()
export class RlsInterceptor implements NestInterceptor {
  constructor(private readonly rls: RlsContext) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const authId = request.user?.id;
    if (!authId) return next.handle();

    return from(
      this.rls.runWithClaims(authId, () => firstValueFrom(next.handle())),
    );
  }
}
