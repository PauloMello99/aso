import { Inject, Injectable } from "@nestjs/common";
import {
  AUTH_PROVIDER,
  IAuthProvider,
} from "../application/ports/auth-provider.interface";

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly auth: IAuthProvider,
  ) {}

  execute(
    accessToken: string,
    newPassword: string,
    refreshToken?: string,
  ): Promise<void> {
    return this.auth.resetPassword(accessToken, newPassword, refreshToken);
  }
}
