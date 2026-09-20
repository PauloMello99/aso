import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CronJobStateModule } from "../../common/cron/cron-job-state.module";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { UserModule } from "../user/user.module";
import { GetChangelogUseCase } from "./application/use-cases/get-changelog.use-case";
import { MarkChangelogSeenUseCase } from "./application/use-cases/mark-changelog-seen.use-case";
import { SendChangelogAnnouncementsUseCase } from "./application/use-cases/send-changelog-announcements.use-case";
import { CHANGELOG_NOTIFICATION_REPOSITORY } from "./domain/changelog-notification.repository.interface";
import { CHANGELOG_TARGET_REPOSITORY } from "./domain/changelog-target.repository.interface";
import { DrizzleChangelogNotificationRepository } from "./infrastructure/persistence/drizzle-changelog-notification.repository";
import { DrizzleChangelogTargetRepository } from "./infrastructure/persistence/drizzle-changelog-target.repository";
import { ChangelogController } from "./interface/changelog.controller";

@Module({
  imports: [
    ConfigModule,
    MailModule,
    CronJobStateModule,
    AuthModule,
    UserModule,
  ],
  controllers: [ChangelogController],
  providers: [
    GetChangelogUseCase,
    MarkChangelogSeenUseCase,
    SendChangelogAnnouncementsUseCase,
    {
      provide: CHANGELOG_NOTIFICATION_REPOSITORY,
      useClass: DrizzleChangelogNotificationRepository,
    },
    {
      provide: CHANGELOG_TARGET_REPOSITORY,
      useClass: DrizzleChangelogTargetRepository,
    },
  ],
  exports: [SendChangelogAnnouncementsUseCase],
})
export class ChangelogModule {}
