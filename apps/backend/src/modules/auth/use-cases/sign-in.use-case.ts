import { Inject, Injectable } from "@nestjs/common";
import {
  AUTH_PROVIDER,
  AuthSession,
  IAuthProvider,
} from "../application/ports/auth-provider.interface";

@Injectable()
export class SignInUseCase {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly auth: IAuthProvider,
  ) {}

  execute(email: string, password: string): Promise<AuthSession> {
    return this.auth.signIn(email, password);
  }
}
