import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { CustomersInfrastructureModule } from "../customers/infrastructure/customers-infrastructure.module";
import { OrgsInfrastructureModule } from "../organizations/infrastructure/orgs-infrastructure.module";
import { AnamnesisInfrastructureModule } from "../anamnesis/infrastructure/anamnesis-infrastructure.module";
import { AnamnesisModule } from "../anamnesis/anamnesis.module";
import { MailModule } from "../mail/mail.module";
import { CustomerSelfServiceInfrastructureModule } from "./infrastructure/customer-self-service-infrastructure.module";
import { SendCustomerSelfRegistrationInviteUseCase } from "./application/use-cases/send-customer-self-registration-invite.use-case";
import { GetCustomerSelfRegistrationByTokenUseCase } from "./application/use-cases/get-customer-self-registration-by-token.use-case";
import { SubmitCustomerSelfRegistrationUseCase } from "./application/use-cases/submit-customer-self-registration.use-case";
import { SendCustomerUpdateInviteUseCase } from "./application/use-cases/send-customer-update-invite.use-case";
import { GetCustomerUpdateInvitationByTokenUseCase } from "./application/use-cases/get-customer-update-invitation-by-token.use-case";
import { SubmitCustomerUpdateUseCase } from "./application/use-cases/submit-customer-update.use-case";
import { CustomerSelfServiceController } from "./interface/customer-self-service.controller";
import { PublicCustomerSelfServiceController } from "./interface/public-customer-self-service.controller";

@Module({
  imports: [
    CustomerSelfServiceInfrastructureModule,
    CustomersInfrastructureModule,
    OrgsInfrastructureModule,
    AnamnesisInfrastructureModule,
    AnamnesisModule,
    MailModule,
    AuthModule,
    SubscriptionsModule,
  ],
  controllers: [
    CustomerSelfServiceController,
    PublicCustomerSelfServiceController,
  ],
  providers: [
    SendCustomerSelfRegistrationInviteUseCase,
    GetCustomerSelfRegistrationByTokenUseCase,
    SubmitCustomerSelfRegistrationUseCase,
    SendCustomerUpdateInviteUseCase,
    GetCustomerUpdateInvitationByTokenUseCase,
    SubmitCustomerUpdateUseCase,
  ],
})
export class CustomerSelfServiceModule {}
