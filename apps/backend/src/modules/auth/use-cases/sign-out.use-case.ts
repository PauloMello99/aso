import { Inject, Injectable } from "@nestjs/common";
import {
  AUTH_PROVIDER,
  IAuthProvider,
} from "../application/ports/auth-provider.interface";

@Injectable()
export class SignOutUseCase {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly auth: IAuthProvider,
  ) {}

  execute(accessToken: string): Promise<void> {
    return this.auth.signOut(accessToken);
  }
}
