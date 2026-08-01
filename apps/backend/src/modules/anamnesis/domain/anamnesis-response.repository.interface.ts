import type { AnamnesisQuestion } from "./anamnesis-question";
import type {
  AnamnesisAnswer,
  AnamnesisResponseEntity,
} from "./anamnesis-response.entity";

export const ANAMNESIS_RESPONSE_REPOSITORY = Symbol(
  "ANAMNESIS_RESPONSE_REPOSITORY",
);

export interface CreateAnamnesisResponseData {
  orgId: string;
  formVersionId: string;
  serviceTypeId: string;
  customerId: string;
  questionsSnapshot: AnamnesisQuestion[];
  createdBy: string | null;
}

export type AnamnesisResponseWithCustomerName = AnamnesisResponseEntity & {
  customerName: string;
  customerEmail: string;
  organizationName: string;
};

export interface MarkSubmittedData {
  answers: AnamnesisAnswer[];
  signerFullName: string;
  signerCpf: string | null;
  signatureStoragePath: string;
  pdfStoragePath: string;
  pdfHashSha256: string;
  requestIp: string | null;
  requestUserAgent: string | null;
  consentTextSnapshot: string;
  consentVersion: string;
  consentAcceptedAt: Date;
}

export interface IAnamnesisResponseRepository {
  create(
    data: CreateAnamnesisResponseData,
  ): Promise<AnamnesisResponseEntity>;

  deletePendingFor(
    customerId: string,
    serviceTypeId: string,
    orgId: string,
  ): Promise<void>;

  delete(id: string): Promise<void>;

  findByToken(
    token: string,
  ): Promise<AnamnesisResponseWithCustomerName | null>;

  markSubmitted(id: string, data: MarkSubmittedData): Promise<boolean>;

  findById(id: string, orgId: string): Promise<AnamnesisResponseEntity | null>;

  findLinkable(
    customerId: string,
    serviceTypeId: string,
    orgId: string,
  ): Promise<AnamnesisResponseEntity[]>;
}
