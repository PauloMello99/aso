import { Inject, Injectable } from "@nestjs/common";
import { AuthUser } from "../application/ports/auth-provider.interface";
import {
  AUTH_PROVIDER,
  IAuthProvider,
} from "../application/ports/auth-provider.interface";
import { UserEntity } from "../../user/domain/user.entity";
import { UserNotFoundException } from "../../user/domain/exceptions/user-not-found.exception";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../user/domain/user.repository.interface";
import { AuditService } from "../../audit/audit.service";

export interface UpdateMeInput {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  onboardingCompletedAt?: string | null;
}

@Injectable()
export class UpdateMeUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(AUTH_PROVIDER) private readonly auth: IAuthProvider,
    private readonly auditService: AuditService,
  ) {}

  async execute(authUser: AuthUser, input: UpdateMeInput): Promise<UserEntity> {
    const current = await this.userRepo.findByAuthId(authUser.id);
    if (!current) throw new UserNotFoundException(authUser.id);

    // E-mail é a identidade de login → atualiza no provedor antes do banco.
    const emailChanged = !!input.email && input.email !== current.email;
    if (emailChanged) {
      await this.auth.updateEmail(authUser.id, input.email!);
    }

    const updated = await this.userRepo.update(authUser.id, {
      name: input.name,
      email: emailChanged ? input.email : undefined,
      avatarUrl: input.avatarUrl,
      // Valor vem do cliente só como sinal (presença = "concluir/dispensar"); o
      // timestamp em si é sempre derivado no servidor (new Date()), nunca confiado
      // do cliente — evita gravar uma data arbitrária de passado/futuro.
      onboardingCompletedAt:
        input.onboardingCompletedAt === undefined
          ? undefined
          : input.onboardingCompletedAt === null
            ? null
            : new Date(),
    });

    const changedFields = Object.keys(input).filter(
      (k) => input[k as keyof UpdateMeInput] !== undefined,
    );
    await this.auditService.log({
      actorId: current.id,
      action: "update",
      entityType: "user",
      entityId: current.id,
      metadata: { fields: changedFields },
    });

    return updated;
  }
}
