import { Module } from "@nestjs/common";
import { UserModule } from "../user/user.module";
import { AuthController } from "./auth.controller";
import { AUTH_PROVIDER } from "./application/ports/auth-provider.interface";
import { SupabaseAuthProvider } from "./infrastructure/providers/supabase-auth.provider";
import { AuthGuard } from "./guards/auth.guard";
import { ForgotPasswordUseCase } from "./use-cases/forgot-password.use-case";
import { RefreshTokenUseCase } from "./use-cases/refresh-token.use-case";
import { ResetPasswordUseCase } from "./use-cases/reset-password.use-case";
import { SignInUseCase } from "./use-cases/sign-in.use-case";
import { SignOutUseCase } from "./use-cases/sign-out.use-case";
import { SignUpUseCase } from "./use-cases/sign-up.use-case";

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [
    { provide: AUTH_PROVIDER, useClass: SupabaseAuthProvider },
    AuthGuard,
    SignUpUseCase,
    SignInUseCase,
    SignOutUseCase,
    RefreshTokenUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
  ],
  exports: [AUTH_PROVIDER, AuthGuard],
})
export class AuthModule {}
