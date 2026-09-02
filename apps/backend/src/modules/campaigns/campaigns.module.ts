import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CronJobStateModule } from "../../common/cron/cron-job-state.module";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { OrgsInfrastructureModule } from "../organizations/infrastructure/orgs-infrastructure.module";
import { CreateCampaignUseCase } from "./application/use-cases/create-campaign.use-case";
import { DeleteCampaignUseCase } from "./application/use-cases/delete-campaign.use-case";
import { GetEmailPreferencesUseCase } from "./application/use-cases/get-email-preferences.use-case";
import { ListCampaignsUseCase } from "./application/use-cases/list-campaigns.use-case";
import { RunCampaignTriggersUseCase } from "./application/use-cases/run-campaign-triggers.use-case";
import { UnsubscribeFromCampaignsUseCase } from "./application/use-cases/unsubscribe-from-campaigns.use-case";
import { UpdateCampaignUseCase } from "./application/use-cases/update-campaign.use-case";
import { UploadCampaignImageUseCase } from "./application/use-cases/upload-campaign-image.use-case";
import { CAMPAIGN_MAILER } from "./domain/campaign-mailer.port";
import { CAMPAIGN_SEND_REPOSITORY } from "./domain/campaign-send.repository.interface";
import { CAMPAIGN_TARGET_REPOSITORY } from "./domain/campaign-target.repository.interface";
import { CAMPAIGN_REPOSITORY } from "./domain/campaign.repository.interface";
import { CUSTOMER_EMAIL_PREFERENCE_REPOSITORY } from "./domain/customer-email-preference.repository.interface";
import { CampaignMailerMailServiceAdapter } from "./infrastructure/campaign-mailer.mail-service.adapter";
import { DrizzleCampaignSendRepository } from "./infrastructure/persistence/drizzle-campaign-send.repository";
import { DrizzleCampaignTargetRepository } from "./infrastructure/persistence/drizzle-campaign-target.repository";
import { DrizzleCampaignRepository } from "./infrastructure/persistence/drizzle-campaign.repository";
import { DrizzleCustomerEmailPreferenceRepository } from "./infrastructure/persistence/drizzle-customer-email-preference.repository";
import { CampaignsController } from "./interface/campaigns.controller";
import { PublicCampaignsController } from "./interface/public-campaigns.controller";

// `DRIZZLE`/`DRIZZLE_ADMIN` vêm do `@Global()` `DatabaseModule` — nenhum import
// aqui (o `DrizzleCampaignRepository` injeta `DRIZZLE`, RLS por request).
// `AuditService` (usado pelos use-cases de create/update/delete) vem do
// `@Global()` `AuditModule` — nenhum import aqui.
// `CronJobStateModule` provê `CRON_JOB_STATE_REPOSITORY` (mesmo token do
// `ReconcilePlanCatalogUseCase`). `MailModule` provê o `MailService` sobre o
// qual o `CampaignMailerMailServiceAdapter` implementa o `CAMPAIGN_MAILER`.
@Module({
  imports: [
    ConfigModule,
    MailModule,
    CronJobStateModule,
    AuthModule,
    OrgsInfrastructureModule,
  ],
  controllers: [PublicCampaignsController, CampaignsController],
  providers: [
    {
      provide: CUSTOMER_EMAIL_PREFERENCE_REPOSITORY,
      useClass: DrizzleCustomerEmailPreferenceRepository,
    },
    {
      provide: CAMPAIGN_REPOSITORY,
      useClass: DrizzleCampaignRepository,
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
    ListCampaignsUseCase,
    CreateCampaignUseCase,
    UpdateCampaignUseCase,
    DeleteCampaignUseCase,
    UploadCampaignImageUseCase,
  ],
  exports: [RunCampaignTriggersUseCase],
})
export class CampaignsModule {}
