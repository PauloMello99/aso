import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { CreateCustomerUseCase } from "./application/use-cases/create-customer.use-case";
import { DeleteCustomerUseCase } from "./application/use-cases/delete-customer.use-case";
import { ListCustomersUseCase } from "./application/use-cases/list-customers.use-case";
import { ListCustomersPageUseCase } from "./application/use-cases/list-customers-page.use-case";
import { ListCustomerOptionsUseCase } from "./application/use-cases/list-customer-options.use-case";
import { ListCustomerOriginsUseCase } from "./application/use-cases/list-customer-origins.use-case";
import { ExportCustomersUseCase } from "./application/use-cases/export-customers.use-case";
import { GetCustomerUseCase } from "./application/use-cases/get-customer.use-case";
import { UpdateCustomerUseCase } from "./application/use-cases/update-customer.use-case";
import {
  UploadCustomerAttachmentUseCase,
  ListCustomerAttachmentsUseCase,
  DeleteCustomerAttachmentUseCase,
  RenameCustomerAttachmentUseCase,
} from "./application/use-cases/customer-attachments.use-cases";
import { CustomersInfrastructureModule } from "./infrastructure/customers-infrastructure.module";
import { CustomersController } from "./interface/customers.controller";

@Module({
  imports: [CustomersInfrastructureModule, AuthModule, SubscriptionsModule],
  controllers: [CustomersController],
  providers: [
    ListCustomersUseCase,
    ListCustomersPageUseCase,
    ListCustomerOptionsUseCase,
    ListCustomerOriginsUseCase,
    ExportCustomersUseCase,
    GetCustomerUseCase,
    CreateCustomerUseCase,
    UpdateCustomerUseCase,
    DeleteCustomerUseCase,
    UploadCustomerAttachmentUseCase,
    ListCustomerAttachmentsUseCase,
    DeleteCustomerAttachmentUseCase,
    RenameCustomerAttachmentUseCase,
  ],
  exports: [CustomersInfrastructureModule],
})
export class CustomersModule {}
