import { Module } from "@nestjs/common";
import { MailModule } from "../../mail/mail.module";
import { UserModule } from "../../user/user.module";
import { TICKET_REPOSITORY } from "../domain/ticket.repository.interface";
import { TICKET_RESPONSE_REPOSITORY } from "../domain/ticket-response.repository.interface";
import { TICKET_CATEGORY_REPOSITORY } from "../domain/ticket-category.repository.interface";
import { TICKET_ATTACHMENT_REPOSITORY } from "../domain/ticket-attachment.repository.interface";
import { INBOUND_EMAIL_REPOSITORY } from "../domain/inbound-email.repository.interface";
import { CAPTCHA_VERIFIER } from "../domain/ports/captcha-verifier.port";
import { INBOUND_EMAIL_CLIENT } from "../domain/ports/inbound-email.port";
import { TRANSACTION_RUNNER } from "../domain/ports/transaction-runner.port";
import { DrizzleTicketRepository } from "./persistence/drizzle-ticket.repository";
import { DrizzleTicketResponseRepository } from "./persistence/drizzle-ticket-response.repository";
import { DrizzleTicketCategoryRepository } from "./persistence/drizzle-ticket-category.repository";
import { DrizzleTicketAttachmentRepository } from "./persistence/drizzle-ticket-attachment.repository";
import { DrizzleInboundEmailRepository } from "./persistence/drizzle-inbound-email.repository";
import { DrizzleTransactionRunner } from "./persistence/drizzle-transaction-runner";
import { SupportNotificationService } from "../application/support-notification.service";
import { TurnstileCaptchaVerifier } from "./turnstile-captcha-verifier";
import { ResendInboundEmailClient } from "./resend-inbound-email.client";

/**
 * `SupportNotificationService` mora aqui (e não em `SupportModule`) para
 * ficar disponível automaticamente em todo consumidor que já importa este
 * módulo (support, admin e internal-cron) sem precisar de import extra.
 * Decisão registrada em deviations_from_plan.
 */
@Module({
  imports: [MailModule, UserModule],
  providers: [
    { provide: TICKET_REPOSITORY, useClass: DrizzleTicketRepository },
    {
      provide: TICKET_RESPONSE_REPOSITORY,
      useClass: DrizzleTicketResponseRepository,
    },
    {
      provide: TICKET_CATEGORY_REPOSITORY,
      useClass: DrizzleTicketCategoryRepository,
    },
    {
      provide: TICKET_ATTACHMENT_REPOSITORY,
      useClass: DrizzleTicketAttachmentRepository,
    },
    {
      provide: INBOUND_EMAIL_REPOSITORY,
      useClass: DrizzleInboundEmailRepository,
    },
    { provide: TRANSACTION_RUNNER, useClass: DrizzleTransactionRunner },
    SupportNotificationService,
    { provide: CAPTCHA_VERIFIER, useClass: TurnstileCaptchaVerifier },
    { provide: INBOUND_EMAIL_CLIENT, useClass: ResendInboundEmailClient },
  ],
  exports: [
    TICKET_REPOSITORY,
    TICKET_RESPONSE_REPOSITORY,
    TICKET_CATEGORY_REPOSITORY,
    TICKET_ATTACHMENT_REPOSITORY,
    INBOUND_EMAIL_REPOSITORY,
    TRANSACTION_RUNNER,
    SupportNotificationService,
    CAPTCHA_VERIFIER,
    INBOUND_EMAIL_CLIENT,
  ],
})
export class SupportInfrastructureModule {}
