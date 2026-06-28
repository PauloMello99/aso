import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  AUTH_PROVIDER,
  AuthSession,
  IAuthProvider,
} from "../application/ports/auth-provider.interface";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../user/domain/user.repository.interface";

@Injectable()
export class SignUpUseCase {
  private readonly logger = new Logger(SignUpUseCase.name);

  constructor(
    @Inject(AUTH_PROVIDER) private readonly auth: IAuthProvider,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
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

    try {
      await this.userRepo.create({
        authId: session.user.id,
        email: session.user.email,
        name,
      });
    } catch (err) {
      await this.rollbackAuthUser(session.user.id);
      throw err;
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
