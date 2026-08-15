import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";
import { CreateTicketUseCase } from "./application/use-cases/create-ticket.use-case";
import { ListTicketsUseCase } from "./application/use-cases/list-tickets.use-case";
import { GetTicketDetailUseCase } from "./application/use-cases/get-ticket-detail.use-case";
import { AddCustomerResponseUseCase } from "./application/use-cases/add-customer-response.use-case";
import { ReopenTicketUseCase } from "./application/use-cases/reopen-ticket.use-case";
import { ListTicketCategoriesUseCase } from "./application/use-cases/list-ticket-categories.use-case";
import { UploadTicketAttachmentUseCase } from "./application/use-cases/upload-ticket-attachment.use-case";
import { GetTicketAttachmentUrlUseCase } from "./application/use-cases/get-ticket-attachment-url.use-case";
import { CreatePublicTicketUseCase } from "./application/use-cases/create-public-ticket.use-case";
import { HandleInboundEmailUseCase } from "./application/use-cases/handle-inbound-email.use-case";
import { SupportInfrastructureModule } from "./infrastructure/support-infrastructure.module";
import { SupportController } from "./interface/support.controller";
import { PublicSupportController } from "./interface/public-support.controller";
import { SupportInboundWebhookController } from "./interface/support-inbound-webhook.controller";
import { PublicSupportFeatureFlagGuard } from "./interface/public-support-feature-flag.guard";

@Module({
  imports: [SupportInfrastructureModule, AuthModule, UserModule],
  controllers: [
    SupportController,
    PublicSupportController,
    SupportInboundWebhookController,
  ],
  providers: [
    CreateTicketUseCase,
    ListTicketsUseCase,
    GetTicketDetailUseCase,
    AddCustomerResponseUseCase,
    ReopenTicketUseCase,
    ListTicketCategoriesUseCase,
    UploadTicketAttachmentUseCase,
    GetTicketAttachmentUrlUseCase,
    CreatePublicTicketUseCase,
    HandleInboundEmailUseCase,
    PublicSupportFeatureFlagGuard,
  ],
  exports: [SupportInfrastructureModule],
})
export class SupportModule {}
