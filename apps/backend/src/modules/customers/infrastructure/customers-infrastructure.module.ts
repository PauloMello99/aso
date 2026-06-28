import { Module } from "@nestjs/common";
import { CUSTOMER_REPOSITORY } from "../domain/customer.repository.interface";
import { CUSTOMER_ORIGIN_REPOSITORY } from "../domain/customer-origin.repository.interface";
import { CUSTOMER_ATTACHMENT_REPOSITORY } from "../domain/customer-attachment.repository.interface";
import { DrizzleCustomerRepository } from "./persistence/drizzle-customer.repository";
import { DrizzleCustomerOriginRepository } from "./persistence/drizzle-customer-origin.repository";
import { DrizzleCustomerAttachmentRepository } from "./persistence/drizzle-customer-attachment.repository";

@Module({
  providers: [
    { provide: CUSTOMER_REPOSITORY, useClass: DrizzleCustomerRepository },
    {
      provide: CUSTOMER_ORIGIN_REPOSITORY,
      useClass: DrizzleCustomerOriginRepository,
    },
    {
      provide: CUSTOMER_ATTACHMENT_REPOSITORY,
      useClass: DrizzleCustomerAttachmentRepository,
    },
  ],
  exports: [
    CUSTOMER_REPOSITORY,
    CUSTOMER_ORIGIN_REPOSITORY,
    CUSTOMER_ATTACHMENT_REPOSITORY,
  ],
})
export class CustomersInfrastructureModule {}
