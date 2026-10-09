import { Module } from "@nestjs/common";
import { CronJobStateModule } from "../../common/cron/cron-job-state.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { OrgsInfrastructureModule } from "../organizations/infrastructure/orgs-infrastructure.module";
import { CAPTCHA_VERIFIER } from "../support/domain/ports/captcha-verifier.port";
import { TurnstileCaptchaVerifier } from "../support/infrastructure/turnstile-captcha-verifier";
import { QUOTE_FORM_REPOSITORY } from "./domain/quote-form.repository.interface";
import { QUOTE_REQUEST_REPOSITORY } from "./domain/quote-request.repository.interface";
import { QUOTE_REQUEST_PURGE_REPOSITORY } from "./domain/quote-request-purge.repository.interface";
import { DrizzleQuoteRequestPurgeRepository } from "./infrastructure/persistence/drizzle-quote-request-purge.repository";
import { QuoteRequestPurger } from "./application/quote-request-purger";
import { QuoteRequestCloser } from "./application/quote-request-closer";
import { CalendarModule } from "../calendar/calendar.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { ScheduleQuoteRequestUseCase } from "./application/use-cases/schedule-quote-request.use-case";
import { DeclineQuoteRequestUseCase } from "./application/use-cases/decline-quote-request.use-case";
import { DrizzleQuoteFormRepository } from "./infrastructure/persistence/drizzle-quote-form.repository";
import { DrizzleQuoteRequestRepository } from "./infrastructure/persistence/drizzle-quote-request.repository";
import { GetMyQuoteFormUseCase } from "./application/use-cases/get-my-quote-form.use-case";
import { UpsertMyQuoteFormUseCase } from "./application/use-cases/upsert-my-quote-form.use-case";
import { GetPublicQuoteFormUseCase } from "./application/use-cases/get-public-quote-form.use-case";
import { SubmitQuoteRequestUseCase } from "./application/use-cases/submit-quote-request.use-case";
import { ListQuoteRequestsUseCase } from "./application/use-cases/list-quote-requests.use-case";
import { GetQuoteRequestUseCase } from "./application/use-cases/get-quote-request.use-case";
import { CountUnreadQuoteRequestsUseCase } from "./application/use-cases/count-unread-quote-requests.use-case";
import { MarkQuoteRequestViewedUseCase } from "./application/use-cases/mark-quote-request-viewed.use-case";
import { PurgeExpiredQuoteRequestsUseCase } from "./application/use-cases/purge-expired-quote-requests.use-case";
import { SweepOrphanQuoteObjectsUseCase } from "./application/use-cases/sweep-orphan-quote-objects.use-case";
import { QuoteRequestsController } from "./interface/quote-requests.controller";
import { PublicQuoteFormsController } from "./interface/public-quote-forms.controller";
import { QuoteFormsController } from "./interface/quote-forms.controller";
import { PublicQuoteFormFeatureFlagGuard } from "./interface/public-quote-form-feature-flag.guard";
import { QuoteCaptchaGuard } from "./interface/quote-captcha.guard";

@Module({
  imports: [
    AuthModule,
    CronJobStateModule,
    NotificationsModule,
    OrgsInfrastructureModule,
    // "Agendou": CreateCalendarEventUseCase + CALENDAR_EVENT_REPOSITORY. Sem ciclo:
    // CalendarModule nao importa QuotesModule.
    CalendarModule,
    // ActiveSubscriptionGuard (endpoint schedule).
    SubscriptionsModule,
  ],
  controllers: [
    PublicQuoteFormsController,
    QuoteFormsController,
    QuoteRequestsController,
  ],
  providers: [
    ListQuoteRequestsUseCase,
    GetQuoteRequestUseCase,
    CountUnreadQuoteRequestsUseCase,
    MarkQuoteRequestViewedUseCase,
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
    {
      provide: QUOTE_REQUEST_PURGE_REPOSITORY,
      useClass: DrizzleQuoteRequestPurgeRepository,
    },
    QuoteRequestPurger,
    QuoteRequestCloser,
    ScheduleQuoteRequestUseCase,
    DeclineQuoteRequestUseCase,
    PurgeExpiredQuoteRequestsUseCase,
    SweepOrphanQuoteObjectsUseCase,
    // Verifier reaproveitado de support/ (sem importar o SupportInfrastructureModule inteiro).
    { provide: CAPTCHA_VERIFIER, useClass: TurnstileCaptchaVerifier },
  ],
  // Consumidos pelo POST /internal/cron/tick (InternalCronModule).
  exports: [PurgeExpiredQuoteRequestsUseCase, SweepOrphanQuoteObjectsUseCase],
})
export class QuotesModule {}
