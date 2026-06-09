import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdjustStockUseCase } from "./application/use-cases/adjust-stock.use-case";
import { CreateMaterialUseCase } from "./application/use-cases/create-material.use-case";
import { DeleteMaterialUseCase } from "./application/use-cases/delete-material.use-case";
import { ListMaterialsUseCase } from "./application/use-cases/list-materials.use-case";
import { ListStockMovementsUseCase } from "./application/use-cases/list-stock-movements.use-case";
import { RestockMaterialUseCase } from "./application/use-cases/restock-material.use-case";
import { UpdateMaterialUseCase } from "./application/use-cases/update-material.use-case";
import { MaterialsInfrastructureModule } from "./infrastructure/materials-infrastructure.module";
import { MaterialsController } from "./interface/materials.controller";

@Module({
  imports: [MaterialsInfrastructureModule, AuthModule],
  controllers: [MaterialsController],
  providers: [
    ListMaterialsUseCase,
    CreateMaterialUseCase,
    UpdateMaterialUseCase,
    DeleteMaterialUseCase,
    RestockMaterialUseCase,
    AdjustStockUseCase,
    ListStockMovementsUseCase,
  ],
  exports: [MaterialsInfrastructureModule],
})
export class MaterialsModule {}

