import { CanActivate, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Kill-switch da superfície pública de suporte (formulário não autenticado).
 * Desligada por padrão: responde 404 (não 503) para não anunciar que a rota
 * existe enquanto a feature está desativada.
 */
@Injectable()
export class PublicSupportFeatureFlagGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    const enabled =
      this.config.get<string>("PUBLIC_SUPPORT_FORM_ENABLED") === "true";
    if (!enabled) {
      throw new NotFoundException();
    }
    return true;
  }
}
