import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CAPTCHA_VERIFIER } from "../support/domain/ports/captcha-verifier.port";
import { TurnstileCaptchaVerifier } from "../support/infrastructure/turnstile-captcha-verifier";
import { QUOTE_FORM_REPOSITORY } from "./domain/quote-form.repository.interface";
import { QUOTE_REQUEST_REPOSITORY } from "./domain/quote-request.repository.interface";
import { DrizzleQuoteFormRepository } from "./infrastructure/persistence/drizzle-quote-form.repository";
import { DrizzleQuoteRequestRepository } from "./infrastructure/persistence/drizzle-quote-request.repository";
import { GetMyQuoteFormUseCase } from "./application/use-cases/get-my-quote-form.use-case";
import { UpsertMyQuoteFormUseCase } from "./application/use-cases/upsert-my-quote-form.use-case";
import { GetPublicQuoteFormUseCase } from "./application/use-cases/get-public-quote-form.use-case";
import { SubmitQuoteRequestUseCase } from "./application/use-cases/submit-quote-request.use-case";
import { PublicQuoteFormsController } from "./interface/public-quote-forms.controller";
import { QuoteFormsController } from "./interface/quote-forms.controller";
import { PublicQuoteFormFeatureFlagGuard } from "./interface/public-quote-form-feature-flag.guard";
import { QuoteCaptchaGuard } from "./interface/quote-captcha.guard";

@Module({
  imports: [AuthModule],
  controllers: [PublicQuoteFormsController, QuoteFormsController],
  providers: [
    GetMyQuoteFormUseCase,
    UpsertMyQuoteFormUseCase,
    GetPublicQuoteFormUseCase,
    SubmitQuoteRequestUseCase,
    PublicQuoteFormFeatureFlagGuard,
    QuoteCaptchaGuard,
    { provide: QUOTE_FORM_REPOSITORY, useClass: DrizzleQuoteFormRepository },
    {
      provide: QUOTE_REQUEST_REPOSITORY,
      useClass: DrizzleQuoteRequestRepository,
    },
    // Verifier reaproveitado de support/ (sem importar o SupportInfrastructureModule inteiro).
    { provide: CAPTCHA_VERIFIER, useClass: TurnstileCaptchaVerifier },
  ],
})
export class QuotesModule {}
