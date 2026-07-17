import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CashierInfrastructureModule } from "../cashier/infrastructure/cashier-infrastructure.module";
import { MaterialsInfrastructureModule } from "../materials/infrastructure/materials-infrastructure.module";
import { CustomersInfrastructureModule } from "../customers/infrastructure/customers-infrastructure.module";
import { OrgsInfrastructureModule } from "../organizations/infrastructure/orgs-infrastructure.module";
import { AnamnesisInfrastructureModule } from "../anamnesis/infrastructure/anamnesis-infrastructure.module";
import { ServicesInfrastructureModule } from "./infrastructure/services-infrastructure.module";
import { ListServicesUseCase } from "./application/use-cases/list-services.use-case";
import { ExportServicesUseCase } from "./application/use-cases/export-services.use-case";
import { GetServiceUseCase } from "./application/use-cases/get-service.use-case";
import { CreateServiceUseCase } from "./application/use-cases/create-service.use-case";
import { UpdateServiceUseCase } from "./application/use-cases/update-service.use-case";
import { CancelServiceUseCase } from "./application/use-cases/cancel-service.use-case";
import { RegisterPaymentUseCase } from "./application/use-cases/register-payment.use-case";
import { CorrectServicePaymentUseCase } from "./application/use-cases/correct-service-payment.use-case";
import { ListServiceTypesUseCase } from "./application/use-cases/list-service-types.use-case";
import { CreateServiceTypeUseCase } from "./application/use-cases/create-service-type.use-case";
import { UpdateServiceTypeUseCase } from "./application/use-cases/update-service-type.use-case";
import {
  UploadServiceMediaUseCase,
  ListServiceMediaUseCase,
  DeleteServiceMediaUseCase,
} from "./application/use-cases/service-media.use-cases";
import { ServicesController } from "./interface/services.controller";

@Module({
  imports: [
    ServicesInfrastructureModule,
    CashierInfrastructureModule,
    MaterialsInfrastructureModule,
    CustomersInfrastructureModule,
    OrgsInfrastructureModule,
    AnamnesisInfrastructureModule,
    AuthModule,
  ],
  controllers: [ServicesController],
  providers: [
    ListServicesUseCase,
    ExportServicesUseCase,
    GetServiceUseCase,
    CreateServiceUseCase,
    UpdateServiceUseCase,
    CancelServiceUseCase,
    RegisterPaymentUseCase,
    CorrectServicePaymentUseCase,
    ListServiceTypesUseCase,
    CreateServiceTypeUseCase,
    UpdateServiceTypeUseCase,
    UploadServiceMediaUseCase,
    ListServiceMediaUseCase,
    DeleteServiceMediaUseCase,
  ],
  exports: [ServicesInfrastructureModule],
})
export class ServicesModule {}
