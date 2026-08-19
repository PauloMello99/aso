import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { CUSTOMER_SELF_REGISTRATION_REPOSITORY } from "../domain/customer-self-registration.repository.interface";
import { CUSTOMER_UPDATE_INVITATION_REPOSITORY } from "../domain/customer-update-invitation.repository.interface";
import { PUBLIC_CUSTOMER_WRITER } from "../domain/ports/public-customer-writer.port";
import { DrizzleCustomerSelfRegistrationRepository } from "./persistence/drizzle-customer-self-registration.repository";
import { DrizzleCustomerUpdateInvitationRepository } from "./persistence/drizzle-customer-update-invitation.repository";
import { DrizzlePublicCustomerWriter } from "./persistence/drizzle-public-customer-writer";

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: CUSTOMER_SELF_REGISTRATION_REPOSITORY,
      useClass: DrizzleCustomerSelfRegistrationRepository,
    },
    {
      provide: CUSTOMER_UPDATE_INVITATION_REPOSITORY,
      useClass: DrizzleCustomerUpdateInvitationRepository,
    },
    {
      provide: PUBLIC_CUSTOMER_WRITER,
      useClass: DrizzlePublicCustomerWriter,
    },
  ],
  exports: [
    CUSTOMER_SELF_REGISTRATION_REPOSITORY,
    CUSTOMER_UPDATE_INVITATION_REPOSITORY,
    PUBLIC_CUSTOMER_WRITER,
  ],
})
export class CustomerSelfServiceInfrastructureModule {}
