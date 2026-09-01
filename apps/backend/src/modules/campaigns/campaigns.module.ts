import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CronJobStateModule } from "../../common/cron/cron-job-state.module";
import { MailModule } from "../mail/mail.module";
import { GetEmailPreferencesUseCase } from "./application/use-cases/get-email-preferences.use-case";
import { RunCampaignTriggersUseCase } from "./application/use-cases/run-campaign-triggers.use-case";
import { UnsubscribeFromCampaignsUseCase } from "./application/use-cases/unsubscribe-from-campaigns.use-case";
import { CAMPAIGN_MAILER } from "./domain/campaign-mailer.port";
import { CAMPAIGN_SEND_REPOSITORY } from "./domain/campaign-send.repository.interface";
import { CAMPAIGN_TARGET_REPOSITORY } from "./domain/campaign-target.repository.interface";
import { CUSTOMER_EMAIL_PREFERENCE_REPOSITORY } from "./domain/customer-email-preference.repository.interface";
import { ORG_CAMPAIGN_SETTINGS_REPOSITORY } from "./domain/org-campaign-settings.repository.interface";
import { CampaignMailerMailServiceAdapter } from "./infrastructure/campaign-mailer.mail-service.adapter";
import { DrizzleCampaignSendRepository } from "./infrastructure/persistence/drizzle-campaign-send.repository";
import { DrizzleCampaignTargetRepository } from "./infrastructure/persistence/drizzle-campaign-target.repository";
import { DrizzleCustomerEmailPreferenceRepository } from "./infrastructure/persistence/drizzle-customer-email-preference.repository";
import { DrizzleOrgCampaignSettingsRepository } from "./infrastructure/persistence/drizzle-org-campaign-settings.repository";
import { PublicCampaignsController } from "./interface/public-campaigns.controller";

// `DRIZZLE_ADMIN` vem do `@Global()` `DatabaseModule` — nenhum import aqui.
// `CronJobStateModule` provê `CRON_JOB_STATE_REPOSITORY` (mesmo token do
// `ReconcilePlanCatalogUseCase`). `MailModule` provê o `MailService` sobre o
// qual o `CampaignMailerMailServiceAdapter` implementa o `CAMPAIGN_MAILER`.
@Module({
  imports: [ConfigModule, MailModule, CronJobStateModule],
  controllers: [PublicCampaignsController],
  providers: [
    {
      provide: CUSTOMER_EMAIL_PREFERENCE_REPOSITORY,
      useClass: DrizzleCustomerEmailPreferenceRepository,
    },
    {
      provide: ORG_CAMPAIGN_SETTINGS_REPOSITORY,
      useClass: DrizzleOrgCampaignSettingsRepository,
    },
    {
      provide: CAMPAIGN_SEND_REPOSITORY,
      useClass: DrizzleCampaignSendRepository,
    },
    {
      provide: CAMPAIGN_TARGET_REPOSITORY,
      useClass: DrizzleCampaignTargetRepository,
    },
    {
      provide: CAMPAIGN_MAILER,
      useClass: CampaignMailerMailServiceAdapter,
    },
    RunCampaignTriggersUseCase,
    GetEmailPreferencesUseCase,
    UnsubscribeFromCampaignsUseCase,
  ],
  exports: [RunCampaignTriggersUseCase],
})
export class CampaignsModule {}
