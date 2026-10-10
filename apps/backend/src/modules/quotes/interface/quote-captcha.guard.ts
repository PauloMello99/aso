import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import {
  CAPTCHA_VERIFIER,
  ICaptchaVerifier,
} from "../../support/domain/ports/captcha-verifier.port";
import { CaptchaVerificationFailedException } from "../../support/domain/exceptions/captcha-verification-failed.exception";
import { extractRequestContext } from "../../anamnesis/interface/request-context";

const TURNSTILE_HEADER = "x-turnstile-token";
const MAX_TOKEN_LENGTH = 2048;

/**
 * Verifica o Turnstile a partir do header ANTES do FilesInterceptor: guards
 * rodam antes de interceptors, entao uma requisicao sem captcha valido e
 * rejeitada antes de o multer bufferizar o upload anonimo. Fail-closed.
 */
@Injectable()
export class QuoteCaptchaGuard implements CanActivate {
  constructor(
    @Inject(CAPTCHA_VERIFIER) private readonly verifier: ICaptchaVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers[TURNSTILE_HEADER];
    const token = typeof header === "string" ? header : "";

    if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
      throw new CaptchaVerificationFailedException();
    }

    const { ip } = extractRequestContext(req);
    const ok = await this.verifier.verify(token, ip ?? undefined);
    if (!ok) throw new CaptchaVerificationFailedException();
    return true;
  }
}
