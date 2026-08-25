import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, from, firstValueFrom } from "rxjs";
import { RlsContext } from "../../database/database.module";
import type { AuthUser } from "../../modules/auth/application/ports/auth-provider.interface";
import {
  runWithActingContext,
  type RequestWithActingContext,
} from "../request-context/acting-context";

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
      .getRequest<RequestWithActingContext & { user?: AuthUser }>();
    const authId = request.user?.id;
    if (!authId) return next.handle();

    return from(
      runWithActingContext(request.actingAsSuperAdmin === true, () =>
        this.rls.runWithClaims(authId, () => firstValueFrom(next.handle())),
      ),
    );
  }
}
