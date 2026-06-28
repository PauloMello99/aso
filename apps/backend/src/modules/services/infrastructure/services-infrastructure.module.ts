import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { SERVICE_REPOSITORY } from "../domain/service.repository.interface";
import { SERVICE_TYPE_REPOSITORY } from "../domain/service-type.repository.interface";
import { DrizzleServiceRepository } from "./persistence/drizzle-service.repository";
import { DrizzleServiceTypeRepository } from "./persistence/drizzle-service-type.repository";

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: SERVICE_REPOSITORY, useClass: DrizzleServiceRepository },
    {
      provide: SERVICE_TYPE_REPOSITORY,
      useClass: DrizzleServiceTypeRepository,
    },
  ],
  exports: [SERVICE_REPOSITORY, SERVICE_TYPE_REPOSITORY],
})
export class ServicesInfrastructureModule {}
