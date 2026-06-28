import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

/**
 * Protege endpoints internos de cron. O job agendado (Railway) deve enviar o
 * header `x-cron-secret` igual ao env `CRON_SECRET`. Não usa AuthGuard/Org guard
 * (não há usuário); os use-cases por trás usam DRIZZLE_ADMIN.
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const provided = req.headers["x-cron-secret"];
    const expected = this.config.get<string>("CRON_SECRET");
    if (!expected || !provided || provided !== expected) {
      throw new UnauthorizedException("Invalid cron secret");
    }
    return true;
  }
}
