import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  isRecipientAllowed,
  parseEmailAllowlist,
} from "../domain/email-allowlist";

const VALID_APP_ENVIRONMENTS: readonly string[] = [
  "production",
  "staging",
  "development",
  "test",
];

/**
 * Trava de segurança contra vazamento de e-mail de teste para destinatário
 * real fora de produção. `enforcing` é SEGURO por padrão: qualquer valor de
 * `APP_ENVIRONMENT` diferente do literal "production" (inclusive ausente)
 * ativa a allowlist. Com enforcing ativo e allowlist vazia, `isAllowed`
 * bloqueia TODO destinatário (fail-safe deliberado). Valor desconhecido e não
 * vazio (typo como "Production") aborta o boot.
 */
@Injectable()
export class EmailAllowlistService {
  private readonly logger = new Logger(EmailAllowlistService.name);
  private readonly enforcing: boolean;
  private readonly allowlist: string[];

  constructor(config: ConfigService) {
    const rawEnvironment = config.get<string>("APP_ENVIRONMENT")?.trim();
    const appEnvironment = rawEnvironment ? rawEnvironment : undefined;

    if (
      appEnvironment !== undefined &&
      !VALID_APP_ENVIRONMENTS.includes(appEnvironment)
    ) {
      throw new Error(
        `APP_ENVIRONMENT inválido: "${appEnvironment}". Valores válidos (case-sensitive): ${VALID_APP_ENVIRONMENTS.join(", ")}.`,
      );
    }

    this.enforcing = appEnvironment !== "production";
    this.allowlist = parseEmailAllowlist(
      config.get<string>("EMAIL_ALLOWLIST"),
    );

    if (appEnvironment === undefined) {
      this.logger.warn(
        `APP_ENVIRONMENT não definido — allowlist de e-mail ENFORCING por padrão (fail-safe). Em produção defina APP_ENVIRONMENT=production.`,
      );
    }

    if (this.enforcing) {
      this.logger.log(
        `Allowlist de e-mail ENFORCING (APP_ENVIRONMENT=${appEnvironment ?? "não definido"}) — ${this.allowlist.length} destinatário(s)`,
      );
      if (this.allowlist.length === 0) {
        this.logger.warn(
          `Allowlist de e-mail ENFORCING com lista VAZIA: TODO e-mail está bloqueado. Preencha EMAIL_ALLOWLIST ou use APP_ENVIRONMENT=production.`,
        );
      }
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
