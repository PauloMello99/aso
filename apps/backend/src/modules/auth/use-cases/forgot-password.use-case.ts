import { Inject, Injectable } from "@nestjs/common";
import {
  AUTH_PROVIDER,
  IAuthProvider,
} from "../application/ports/auth-provider.interface";

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly auth: IAuthProvider,
  ) {}

  execute(email: string): Promise<void> {
    return this.auth.forgotPassword(email);
  }
}
