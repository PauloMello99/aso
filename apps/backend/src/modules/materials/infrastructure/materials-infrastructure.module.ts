import { Module } from "@nestjs/common";
import { MATERIAL_REPOSITORY } from "../domain/material.repository.interface";
import { STOCK_MOVEMENT_REPOSITORY } from "../domain/stock-movement.repository.interface";
import { DrizzleMaterialRepository } from "./persistence/drizzle-material.repository";
import { DrizzleStockMovementRepository } from "./persistence/drizzle-stock-movement.repository";

@Module({
  providers: [
    { provide: MATERIAL_REPOSITORY, useClass: DrizzleMaterialRepository },
    {
      provide: STOCK_MOVEMENT_REPOSITORY,
      useClass: DrizzleStockMovementRepository,
    },
  ],
  exports: [MATERIAL_REPOSITORY, STOCK_MOVEMENT_REPOSITORY],
})
export class MaterialsInfrastructureModule {}

