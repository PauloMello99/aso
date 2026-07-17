import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrgsInfrastructureModule } from "../organizations/infrastructure/orgs-infrastructure.module";
import { ServicesInfrastructureModule } from "../services/infrastructure/services-infrastructure.module";
import { AnamnesisInfrastructureModule } from "./infrastructure/anamnesis-infrastructure.module";
import { CreateOrUpdateAnamnesisFormUseCase } from "./application/use-cases/create-or-update-anamnesis-form.use-case";
import { ListAnamnesisFormVersionsUseCase } from "./application/use-cases/list-anamnesis-form-versions.use-case";
import { GetCurrentAnamnesisFormVersionUseCase } from "./application/use-cases/get-current-anamnesis-form-version.use-case";
import { AnamnesisController } from "./interface/anamnesis.controller";

@Module({
  imports: [
    AnamnesisInfrastructureModule,
    ServicesInfrastructureModule,
    OrgsInfrastructureModule,
    AuthModule,
  ],
  controllers: [AnamnesisController],
  providers: [
    CreateOrUpdateAnamnesisFormUseCase,
    ListAnamnesisFormVersionsUseCase,
    GetCurrentAnamnesisFormVersionUseCase,
  ],
})
export class AnamnesisModule {}
