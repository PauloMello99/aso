import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailService } from "../../mail/application/mail.service";
import {
  AUTH_PROVIDER,
  AuthSession,
  IAuthProvider,
} from "../application/ports/auth-provider.interface";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../user/domain/user.repository.interface";
import { AuditService } from "../../audit/audit.service";
import { CURRENT_TERMS_VERSION } from "../domain/legal-terms-version";
import { TermsAcceptanceRequiredException } from "../domain/exceptions/terms-acceptance-required.exception";

@Injectable()
export class SignUpUseCase {
  private readonly logger = new Logger(SignUpUseCase.name);

  constructor(
    @Inject(AUTH_PROVIDER) private readonly auth: IAuthProvider,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    email: string,
    password: string,
    name: string,
    acceptedTermsVersion: string,
  ): Promise<AuthSession> {
    if (acceptedTermsVersion !== CURRENT_TERMS_VERSION) {
      throw new TermsAcceptanceRequiredException();
    }

    const session = await this.auth.signUp(email, password);

    let createdUserId: string | null = null;
    try {
      const created = await this.userRepo.create({
        authId: session.user.id,
        email: session.user.email,
        name,
        termsAcceptedAt: new Date(),
        termsVersion: CURRENT_TERMS_VERSION,
      });
      createdUserId = created.id;
    } catch (err) {
      await this.rollbackAuthUser(session.user.id);
      throw err;
    }

    await this.auditService.log({
      actorId: createdUserId,
      action: "create",
      entityType: "user",
      entityId: createdUserId,
      metadata: { name, email },
    });

    try {
      const appUrl = this.config.get<string>("FRONTEND_URL");
      await this.mail.sendWelcome({ to: email, name, appUrl });
    } catch (mailErr) {
      this.logger.warn(
        `Falha ao enviar welcome para ${email}: ${
          mailErr instanceof Error ? mailErr.message : String(mailErr)
        }`,
      );
    }

    return session;
  }

  private async rollbackAuthUser(authId: string): Promise<void> {
    try {
      await this.auth.deleteUser(authId);
    } catch (rollbackErr) {
      this.logger.error(
        `Falha ao reverter auth user órfão ${authId} após erro no cadastro`,
        rollbackErr instanceof Error ? rollbackErr.stack : undefined,
      );
    }
  }
}
