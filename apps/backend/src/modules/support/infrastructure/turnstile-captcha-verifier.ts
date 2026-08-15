import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ICaptchaVerifier } from "../domain/ports/captcha-verifier.port";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

@Injectable()
export class TurnstileCaptchaVerifier implements ICaptchaVerifier {
  private readonly logger = new Logger(TurnstileCaptchaVerifier.name);
  private readonly secretKey: string;
  private readonly devBypassEnabled: boolean;

  constructor(config: ConfigService) {
    this.secretKey = config.get<string>("TURNSTILE_SECRET_KEY") ?? "";
    this.devBypassEnabled =
      config.get<string>("TURNSTILE_DEV_BYPASS") === "true";
  }

  async verify(token: string, remoteIp?: string): Promise<boolean> {
    if (!this.secretKey) {
      if (this.devBypassEnabled) {
        this.logger.warn(
          "TURNSTILE_SECRET_KEY ausente e TURNSTILE_DEV_BYPASS=true — bypass de dev, verify retorna true sem checar o CAPTCHA",
        );
        return true;
      }
      this.logger.error(
        "TURNSTILE_SECRET_KEY ausente e TURNSTILE_DEV_BYPASS != 'true' — falhando fechado (verify retorna false)",
      );
      return false;
    }

    const body = new URLSearchParams({
      secret: this.secretKey,
      response: token,
    });
    if (remoteIp) body.set("remoteip", remoteIp);

    try {
      const res = await fetch(TURNSTILE_VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(5000),
      });

      const data = (await res.json()) as TurnstileVerifyResponse;

      if (!data.success) {
        this.logger.warn(
          `Verificação de CAPTCHA falhou: ${JSON.stringify(data["error-codes"] ?? [])}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar CAPTCHA (timeout ou falha de rede): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }
}
