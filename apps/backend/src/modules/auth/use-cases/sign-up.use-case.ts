import { Inject, Injectable } from "@nestjs/common";
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
  constructor(
    @Inject(AUTH_PROVIDER) private readonly auth: IAuthProvider,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(
    email: string,
    password: string,
    name: string,
  ): Promise<AuthSession> {
    const session = await this.auth.signUp(email, password);
    await this.userRepo.create({
      authId: session.user.id,
      email: session.user.email,
      name,
    });
    return session;
  }
}
