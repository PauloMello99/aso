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

export interface UpdateMeInput {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
}

@Injectable()
export class UpdateMeUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(AUTH_PROVIDER) private readonly auth: IAuthProvider,
  ) {}

  async execute(authUser: AuthUser, input: UpdateMeInput): Promise<UserEntity> {
    const current = await this.userRepo.findByAuthId(authUser.id);
    if (!current) throw new UserNotFoundException(authUser.id);

    // E-mail é a identidade de login → atualiza no provedor antes do banco.
    const emailChanged = !!input.email && input.email !== current.email;
    if (emailChanged) {
      await this.auth.updateEmail(authUser.id, input.email!);
    }

    return this.userRepo.update(authUser.id, {
      name: input.name,
      email: emailChanged ? input.email : undefined,
      avatarUrl: input.avatarUrl,
    });
  }
}
