import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CreateCustomerUseCase } from "./application/use-cases/create-customer.use-case";
import { DeleteCustomerUseCase } from "./application/use-cases/delete-customer.use-case";
import { ListCustomersUseCase } from "./application/use-cases/list-customers.use-case";
import { ListCustomerOriginsUseCase } from "./application/use-cases/list-customer-origins.use-case";
import { ExportCustomersUseCase } from "./application/use-cases/export-customers.use-case";
import { UpdateCustomerUseCase } from "./application/use-cases/update-customer.use-case";
import {
  UploadCustomerAttachmentUseCase,
  ListCustomerAttachmentsUseCase,
  DeleteCustomerAttachmentUseCase,
} from "./application/use-cases/customer-attachments.use-cases";
import { CustomersInfrastructureModule } from "./infrastructure/customers-infrastructure.module";
import { CustomersController } from "./interface/customers.controller";

@Module({
  imports: [CustomersInfrastructureModule, AuthModule],
  controllers: [CustomersController],
  providers: [
    ListCustomersUseCase,
    ListCustomerOriginsUseCase,
    ExportCustomersUseCase,
    CreateCustomerUseCase,
    UpdateCustomerUseCase,
    DeleteCustomerUseCase,
    UploadCustomerAttachmentUseCase,
    ListCustomerAttachmentsUseCase,
    DeleteCustomerAttachmentUseCase,
  ],
  exports: [CustomersInfrastructureModule],
})
export class CustomersModule {}
