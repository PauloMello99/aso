import { Controller, Get } from "@nestjs/common";
import { GetHealthUseCase } from "./use-cases/get-health.use-case";

@Controller("health")
export class HealthController {
  constructor(private readonly getHealthUseCase: GetHealthUseCase) {}

  @Get()
  getHealth() {
    return this.getHealthUseCase.execute();
  }
}
