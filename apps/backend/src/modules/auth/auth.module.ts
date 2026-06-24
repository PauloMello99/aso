import { Module } from "@nestjs/common";
import { UserModule } from "../user/user.module";
import { AuthController } from "./auth.controller";
import { AUTH_PROVIDER } from "./application/ports/auth-provider.interface";
import { STORAGE_PROVIDER } from "./application/ports/storage-provider.interface";
import { SupabaseAuthProvider } from "./infrastructure/providers/supabase-auth.provider";
import { SupabaseStorageProvider } from "./infrastructure/providers/supabase-storage.provider";
import { AuthGuard } from "./guards/auth.guard";
import { OrgMembershipGuard } from "./guards/org-membership.guard";
import { OrgOwnerGuard } from "./guards/org-owner.guard";
import { ForgotPasswordUseCase } from "./use-cases/forgot-password.use-case";
import { RefreshTokenUseCase } from "./use-cases/refresh-token.use-case";
import { ResetPasswordUseCase } from "./use-cases/reset-password.use-case";
import { SignInUseCase } from "./use-cases/sign-in.use-case";
import { SignOutUseCase } from "./use-cases/sign-out.use-case";
import { SignUpUseCase } from "./use-cases/sign-up.use-case";
import { UpdateMeUseCase } from "./use-cases/update-me.use-case";
import { UploadAvatarUseCase } from "./use-cases/upload-avatar.use-case";

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [
    { provide: AUTH_PROVIDER, useClass: SupabaseAuthProvider },
    { provide: STORAGE_PROVIDER, useClass: SupabaseStorageProvider },
    AuthGuard,
    OrgMembershipGuard,
    OrgOwnerGuard,
    SignUpUseCase,
    SignInUseCase,
    SignOutUseCase,
    RefreshTokenUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    UpdateMeUseCase,
    UploadAvatarUseCase,
  ],
  exports: [
    AUTH_PROVIDER,
    STORAGE_PROVIDER,
    AuthGuard,
    OrgMembershipGuard,
    OrgOwnerGuard,
  ],
})
export class AuthModule {}
