import { Inject, Injectable } from "@nestjs/common";
import { MailService } from "../../mail/application/mail.service";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../user/domain/user.repository.interface";
import {
  AUTH_PROVIDER,
  IAuthProvider,
} from "../application/ports/auth-provider.interface";

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly auth: IAuthProvider,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly mail: MailService,
  ) {}

  async execute(email: string): Promise<void> {
    const resetUrl = await this.auth.generatePasswordResetLink(email);
    // Usuário inexistente → silêncio (sem enumeração de e-mail).
    if (!resetUrl) return;

    const user = await this.userRepo.findByEmail(email);
    // Envio CRÍTICO: se o canal estiver habilitado e falhar, propaga (o usuário
    // pode tentar novamente). Em dev o canal é no-op (send retorna false).
    await this.mail.sendPasswordReset({
      to: email,
      name: user?.name,
      resetUrl,
    });
  }
}
