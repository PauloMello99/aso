import type { AnamnesisQuestion } from "../anamnesis-question";
import type { AnamnesisAnswer } from "../anamnesis-response.entity";

export const ANAMNESIS_DOCUMENT_GENERATOR = Symbol(
  "ANAMNESIS_DOCUMENT_GENERATOR",
);

export interface AnamnesisDocumentInput {
  questionsSnapshot: AnamnesisQuestion[];
  answers: AnamnesisAnswer[];
  signerFullName: string;
  signerCpf: string | null;
  signaturePng: Buffer;
  signedAt: Date;
  responseId: string;
  formVersionId: string | null;
  formHash: string;
  requestIp: string | null;
  requestUserAgent: string | null;
}

/** Gera o PDF consolidado (perguntas/respostas + assinatura + evidências) do termo de consentimento. */
export interface IAnamnesisDocumentGenerator {
  generate(input: AnamnesisDocumentInput): Promise<Buffer>;
}
