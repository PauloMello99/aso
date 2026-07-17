import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { ANAMNESIS_FORM_REPOSITORY } from "../domain/anamnesis-form.repository.interface";
import { ANAMNESIS_RESPONSE_REPOSITORY } from "../domain/anamnesis-response.repository.interface";
import { DrizzleAnamnesisFormRepository } from "./persistence/drizzle-anamnesis-form.repository";
import { DrizzleAnamnesisResponseRepository } from "./persistence/drizzle-anamnesis-response.repository";

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: ANAMNESIS_FORM_REPOSITORY,
      useClass: DrizzleAnamnesisFormRepository,
    },
    {
      provide: ANAMNESIS_RESPONSE_REPOSITORY,
      useClass: DrizzleAnamnesisResponseRepository,
    },
  ],
  exports: [ANAMNESIS_FORM_REPOSITORY, ANAMNESIS_RESPONSE_REPOSITORY],
})
export class AnamnesisInfrastructureModule {}
