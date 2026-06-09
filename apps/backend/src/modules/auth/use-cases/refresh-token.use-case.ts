import { Inject, Injectable } from "@nestjs/common";
import {
  AUTH_PROVIDER,
  AuthSession,
  IAuthProvider,
} from "../application/ports/auth-provider.interface";

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly auth: IAuthProvider,
  ) {}

  execute(refreshToken: string): Promise<AuthSession> {
    return this.auth.refreshToken(refreshToken);
  }
}
