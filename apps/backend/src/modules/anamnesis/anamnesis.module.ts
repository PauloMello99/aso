import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrgsInfrastructureModule } from "../organizations/infrastructure/orgs-infrastructure.module";
import { ServicesInfrastructureModule } from "../services/infrastructure/services-infrastructure.module";
import { CustomersInfrastructureModule } from "../customers/infrastructure/customers-infrastructure.module";
import { MailModule } from "../mail/mail.module";
import { AnamnesisInfrastructureModule } from "./infrastructure/anamnesis-infrastructure.module";
import { CreateOrUpdateAnamnesisFormUseCase } from "./application/use-cases/create-or-update-anamnesis-form.use-case";
import { ListAnamnesisFormVersionsUseCase } from "./application/use-cases/list-anamnesis-form-versions.use-case";
import { GetCurrentAnamnesisFormVersionUseCase } from "./application/use-cases/get-current-anamnesis-form-version.use-case";
import { SendAnamnesisInviteUseCase } from "./application/use-cases/send-anamnesis-invite.use-case";
import { GetAnamnesisResponseByTokenUseCase } from "./application/use-cases/get-anamnesis-response-by-token.use-case";
import { SubmitAnamnesisResponseUseCase } from "./application/use-cases/submit-anamnesis-response.use-case";
import { AnamnesisController } from "./interface/anamnesis.controller";
import { AnamnesisResponsesController } from "./interface/anamnesis-responses.controller";
import { PublicAnamnesisController } from "./interface/public-anamnesis.controller";

@Module({
  imports: [
    AnamnesisInfrastructureModule,
    ServicesInfrastructureModule,
    OrgsInfrastructureModule,
    CustomersInfrastructureModule,
    MailModule,
    AuthModule,
  ],
  controllers: [
    AnamnesisController,
    AnamnesisResponsesController,
    PublicAnamnesisController,
  ],
  providers: [
    CreateOrUpdateAnamnesisFormUseCase,
    ListAnamnesisFormVersionsUseCase,
    GetCurrentAnamnesisFormVersionUseCase,
    SendAnamnesisInviteUseCase,
    GetAnamnesisResponseByTokenUseCase,
    SubmitAnamnesisResponseUseCase,
  ],
})
export class AnamnesisModule {}
