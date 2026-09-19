import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  isRecipientAllowed,
  parseEmailAllowlist,
} from "../domain/email-allowlist";

/**
 * Trava de segurança contra vazamento de e-mail de teste para destinatário
 * real fora de produção. `enforcing` é SEGURO por padrão: qualquer valor de
 * `APP_ENVIRONMENT` diferente do literal "production" (inclusive ausente)
 * ativa a allowlist. Com enforcing ativo e allowlist vazia, `isAllowed`
 * bloqueia TODO destinatário (fail-safe deliberado).
 */
@Injectable()
export class EmailAllowlistService {
  private readonly logger = new Logger(EmailAllowlistService.name);
  private readonly enforcing: boolean;
  private readonly allowlist: string[];

  constructor(config: ConfigService) {
    const appEnvironment = config.get<string>("APP_ENVIRONMENT");
    this.enforcing = appEnvironment !== "production";
    this.allowlist = parseEmailAllowlist(
      config.get<string>("EMAIL_ALLOWLIST"),
    );

    if (this.enforcing) {
      this.logger.log(
        `Allowlist de e-mail ENFORCING (APP_ENVIRONMENT=${appEnvironment ?? "não definido"}) — ${this.allowlist.length} destinatário(s)`,
      );
    } else {
      this.logger.log(
        `Allowlist de e-mail DESLIGADA (APP_ENVIRONMENT=${appEnvironment})`,
      );
    }
  }

  isAllowed(to: string): boolean {
    return !this.enforcing || isRecipientAllowed(to, this.allowlist);
  }
}
