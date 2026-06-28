import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "./decorators/current-user.decorator";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { SignInDto } from "./dto/sign-in.dto";
import { SignUpDto } from "./dto/sign-up.dto";
import { AuthGuard } from "./guards/auth.guard";
import { AuthUser } from "./application/ports/auth-provider.interface";
import { ForgotPasswordUseCase } from "./use-cases/forgot-password.use-case";
import { RefreshTokenUseCase } from "./use-cases/refresh-token.use-case";
import { ResetPasswordUseCase } from "./use-cases/reset-password.use-case";
import { SignInUseCase } from "./use-cases/sign-in.use-case";
import { SignOutUseCase } from "./use-cases/sign-out.use-case";
import { SignUpUseCase } from "./use-cases/sign-up.use-case";
import { UpdateMeUseCase } from "./use-cases/update-me.use-case";
import { UploadAvatarUseCase } from "./use-cases/upload-avatar.use-case";
import { DeleteAccountUseCase } from "./use-cases/delete-account.use-case";
import { UpdateMeDto } from "./dto/update-me.dto";
import { GetMeUseCase } from "../user/application/use-cases/get-me.use-case";

/** Subconjunto do arquivo multer que usamos (evita depender de @types/multer). */
interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly signUpUseCase: SignUpUseCase,
    private readonly signInUseCase: SignInUseCase,
    private readonly signOutUseCase: SignOutUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateMeUseCase: UpdateMeUseCase,
    private readonly uploadAvatarUseCase: UploadAvatarUseCase,
    private readonly deleteAccountUseCase: DeleteAccountUseCase,
  ) {}

  // Endpoints de credenciais: limites apertados contra brute-force/abuso (SEC-4).
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("sign-up")
  signUp(@Body() dto: SignUpDto) {
    return this.signUpUseCase.execute(dto.email, dto.password, dto.name);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("sign-in")
  signIn(@Body() dto: SignInDto) {
    return this.signInUseCase.execute(dto.email, dto.password);
  }

  @Post("sign-out")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  signOut(@Headers("authorization") auth: string) {
    return this.signOutUseCase.execute(auth.slice(7));
  }

  @Post("refresh-token")
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.refreshTokenUseCase.execute(dto.refreshToken);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("forgot-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.forgotPasswordUseCase.execute(dto.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("reset-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.resetPasswordUseCase.execute(
      dto.accessToken,
      dto.newPassword,
      dto.refreshToken,
    );
  }

  @Get("me")
  @UseGuards(AuthGuard)
  getMe(@CurrentUser() user: AuthUser) {
    return this.getMeUseCase.execute(user);
  }

  @Patch("me")
  @UseGuards(AuthGuard)
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.updateMeUseCase.execute(user, dto);
  }

  @Delete("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  async deleteMe(@CurrentUser() user: AuthUser) {
    await this.deleteAccountUseCase.execute(user);
  }

  @Post("me/avatar")
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(png|jpe?g|webp|gif)$/ }),
        ],
      }),
    )
    file: UploadedImage,
  ) {
    return this.uploadAvatarUseCase.execute(user, file.buffer, file.mimetype);
  }
}
