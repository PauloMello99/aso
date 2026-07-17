import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { ANAMNESIS_FORM_REPOSITORY } from "../domain/anamnesis-form.repository.interface";
import { DrizzleAnamnesisFormRepository } from "./persistence/drizzle-anamnesis-form.repository";

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: ANAMNESIS_FORM_REPOSITORY,
      useClass: DrizzleAnamnesisFormRepository,
    },
  ],
  exports: [ANAMNESIS_FORM_REPOSITORY],
})
export class AnamnesisInfrastructureModule {}
