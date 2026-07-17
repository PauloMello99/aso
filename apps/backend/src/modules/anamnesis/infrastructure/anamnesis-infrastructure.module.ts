import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { ANAMNESIS_FORM_REPOSITORY } from "../domain/anamnesis-form.repository.interface";
import { ANAMNESIS_RESPONSE_REPOSITORY } from "../domain/anamnesis-response.repository.interface";
import { ANAMNESIS_DOCUMENT_GENERATOR } from "../domain/ports/anamnesis-document-generator.port";
import { DrizzleAnamnesisFormRepository } from "./persistence/drizzle-anamnesis-form.repository";
import { DrizzleAnamnesisResponseRepository } from "./persistence/drizzle-anamnesis-response.repository";
import { PdfKitAnamnesisDocumentGenerator } from "./providers/pdfkit-anamnesis-document.generator";

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
    {
      provide: ANAMNESIS_DOCUMENT_GENERATOR,
      useClass: PdfKitAnamnesisDocumentGenerator,
    },
  ],
  exports: [
    ANAMNESIS_FORM_REPOSITORY,
    ANAMNESIS_RESPONSE_REPOSITORY,
    ANAMNESIS_DOCUMENT_GENERATOR,
  ],
})
export class AnamnesisInfrastructureModule {}
