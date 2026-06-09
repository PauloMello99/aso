import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { GetHealthUseCase } from "./use-cases/get-health.use-case";

@Module({
  controllers: [HealthController],
  providers: [GetHealthUseCase],
})
export class HealthModule {}
