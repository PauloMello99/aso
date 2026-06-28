import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { OrgsInfrastructureModule } from "../organizations/infrastructure/orgs-infrastructure.module";
import { AdjustStockUseCase } from "./application/use-cases/adjust-stock.use-case";
import { CreateMaterialUseCase } from "./application/use-cases/create-material.use-case";
import { DeleteMaterialUseCase } from "./application/use-cases/delete-material.use-case";
import { ListMaterialsUseCase } from "./application/use-cases/list-materials.use-case";
import { ExportMaterialsUseCase } from "./application/use-cases/export-materials.use-case";
import { ListStockMovementsUseCase } from "./application/use-cases/list-stock-movements.use-case";
import { RestockMaterialUseCase } from "./application/use-cases/restock-material.use-case";
import { SetMaterialArchivedUseCase } from "./application/use-cases/set-material-archived.use-case";
import { UpdateMaterialUseCase } from "./application/use-cases/update-material.use-case";
import { GetStockSettingsUseCase } from "./application/use-cases/get-stock-settings.use-case";
import { SetStockIntervalUseCase } from "./application/use-cases/set-stock-interval.use-case";
import { CreateStockVerificationUseCase } from "./application/use-cases/create-stock-verification.use-case";
import { ListStockVerificationsUseCase } from "./application/use-cases/list-stock-verifications.use-case";
import { SendStockCheckRemindersUseCase } from "./application/use-cases/send-stock-check-reminders.use-case";
import { MaterialsInfrastructureModule } from "./infrastructure/materials-infrastructure.module";
import { MaterialsController } from "./interface/materials.controller";
import { StockCronController } from "./interface/stock-cron.controller";

@Module({
  imports: [
    MaterialsInfrastructureModule,
    AuthModule,
    NotificationsModule,
    OrgsInfrastructureModule,
  ],
  controllers: [MaterialsController, StockCronController],
  providers: [
    ListMaterialsUseCase,
    ExportMaterialsUseCase,
    CreateMaterialUseCase,
    UpdateMaterialUseCase,
    DeleteMaterialUseCase,
    RestockMaterialUseCase,
    AdjustStockUseCase,
    SetMaterialArchivedUseCase,
    ListStockMovementsUseCase,
    GetStockSettingsUseCase,
    SetStockIntervalUseCase,
    CreateStockVerificationUseCase,
    ListStockVerificationsUseCase,
    SendStockCheckRemindersUseCase,
  ],
  exports: [MaterialsInfrastructureModule],
})
export class MaterialsModule {}

