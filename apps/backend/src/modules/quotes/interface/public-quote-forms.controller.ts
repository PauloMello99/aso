import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import {
  GetPublicQuoteFormUseCase,
  PublicQuoteFormView,
} from "../application/use-cases/get-public-quote-form.use-case";
import { SubmitQuoteRequestUseCase } from "../application/use-cases/submit-quote-request.use-case";
import {
  MAX_QUOTE_IMAGES,
  MAX_QUOTE_IMAGE_BYTES,
} from "../domain/detect-image-type";
import { SubmitQuoteRequestDto } from "./dto/submit-quote-request.dto";
import { PublicQuoteFormFeatureFlagGuard } from "./public-quote-form-feature-flag.guard";
import { QuoteCaptchaGuard } from "./quote-captcha.guard";

/** Shape minimo do arquivo entregue pelo `FilesInterceptor` (multer, memoryStorage). */
interface UploadedImage {
  buffer: Buffer;
  size: number;
}

@Controller("public/quote-forms")
@UseGuards(PublicQuoteFormFeatureFlagGuard)
export class PublicQuoteFormsController {
  constructor(
    private readonly getPublicForm: GetPublicQuoteFormUseCase,
    private readonly submitRequest: SubmitQuoteRequestUseCase,
  ) {}

  @Get(":slug")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  get(@Param("slug") slug: string): Promise<PublicQuoteFormView> {
    return this.getPublicForm.execute(slug);
  }

  // Ordem efetiva: Throttler (global) -> flag (classe) -> captcha (metodo) ->
  // FilesInterceptor -> ValidationPipe -> handler. O captcha roda antes do multer.
  // O tipo da imagem e decidido por magic bytes no use-case (nao por pipes de arquivo).
  @Post(":slug/requests")
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @HttpCode(201)
  @UseGuards(QuoteCaptchaGuard)
  @UseInterceptors(
    FilesInterceptor("images", MAX_QUOTE_IMAGES, {
      limits: {
        files: MAX_QUOTE_IMAGES,
        fileSize: MAX_QUOTE_IMAGE_BYTES,
        fields: 10,
        fieldSize: 16 * 1024,
        parts: 13,
      },
    }),
  )
  async submit(
    @Param("slug") slug: string,
    @Body() dto: SubmitQuoteRequestDto,
    @UploadedFiles() files: UploadedImage[] | undefined,
  ): Promise<{ received: true }> {
    await this.submitRequest.execute({
      slug,
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      idea: dto.idea,
      consentVersion: dto.consentVersion,
      privacyConsent: dto.privacyConsent,
      contactRetentionConsent: dto.contactRetentionConsent,
      files: (files ?? []).map((f) => ({ buffer: f.buffer, size: f.size })),
    });
    return { received: true };
  }
}
