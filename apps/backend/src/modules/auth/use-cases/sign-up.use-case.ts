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
  ): Promise<AuthSession> {
    // Cadastro atômico (SEC-3): a identidade no provedor de auth e a linha em
    // `public.users` precisam existir juntas. Como são dois sistemas distintos
    // (sem transação compartilhada), aplicamos uma saga com compensação: se a
    // persistência do usuário falhar, removemos a identidade recém-criada para
    // não deixar um auth user órfão (que bloquearia um novo cadastro do e-mail).
    const session = await this.auth.signUp(email, password);

    let createdUserId: string | null = null;
    try {
      const created = await this.userRepo.create({
        authId: session.user.id,
        email: session.user.email,
        name,
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

    // E-mail de boas-vindas: best-effort — nunca quebra/bloqueia o cadastro.
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

  /** Compensação best-effort: remove a identidade órfã no provedor de auth. */
  private async rollbackAuthUser(authId: string): Promise<void> {
    try {
      await this.auth.deleteUser(authId);
    } catch (rollbackErr) {
      // Não mascaramos o erro original; apenas registramos a falha de limpeza.
      this.logger.error(
        `Falha ao reverter auth user órfão ${authId} após erro no cadastro`,
        rollbackErr instanceof Error ? rollbackErr.stack : undefined,
      );
    }
  }
}
