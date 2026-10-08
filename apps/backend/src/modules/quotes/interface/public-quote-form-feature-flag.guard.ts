import { CanActivate, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Kill-switch do formulario publico de orcamento (rota publica e rota
 * autenticada de configuracao). Desligada por padrao: responde 404 (nao 503)
 * para nao anunciar que a rota existe.
 */
@Injectable()
export class PublicQuoteFormFeatureFlagGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    const enabled =
      this.config.get<string>("PUBLIC_QUOTE_FORM_ENABLED") === "true";
    if (!enabled) {
      throw new NotFoundException();
    }
    return true;
  }
}
