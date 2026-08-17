import { CanActivate, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Kill-switch da superfície pública de billing (preços vigentes para a
 * landing page). Desligada por padrão: responde 404 (não 503) para não
 * anunciar que a rota existe enquanto a feature está desativada.
 */
@Injectable()
export class PublicBillingFeatureFlagGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    const enabled = this.config.get<string>("PUBLIC_PRICING_ENABLED") === "true";
    if (!enabled) {
      throw new NotFoundException();
    }
    return true;
  }
}
