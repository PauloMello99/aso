import type { AnamnesisQuestion } from "./anamnesis-question";
import type {
  AnamnesisAnswer,
  AnamnesisResponseEntity,
  AnamnesisResponseStatus,
} from "./anamnesis-response.entity";

export const ANAMNESIS_RESPONSE_REPOSITORY = Symbol(
  "ANAMNESIS_RESPONSE_REPOSITORY",
);

export interface CreateAnamnesisResponseData {
  orgId: string;
  formVersionId: string;
  serviceTypeId: string;
  customerId: string | null;
  questionsSnapshot: AnamnesisQuestion[];
  createdBy: string | null;
}

export type AnamnesisResponseWithCustomerName = AnamnesisResponseEntity & {
  customerName: string;
  customerEmail: string;
  organizationName: string;
};

export interface AnamnesisResponseListItem {
  id: string;
  customerId: string | null;
  customerName: string | null;
  serviceTypeId: string | null;
  serviceTypeName: string | null;
  status: AnamnesisResponseStatus | "expired";
  submittedAt: Date | null;
  createdAt: Date;
  formVersionId: string | null;
  versionNumber: number | null;
}

export type AnamnesisResponseDetail = AnamnesisResponseEntity & {
  customerName: string | null;
  serviceTypeName: string | null;
  versionNumber: number | null;
  signerFullName: string | null;
  signerCpf: string | null;
  signatureStoragePath: string | null;
  pdfStoragePath: string | null;
  consentTextSnapshot: string | null;
  consentAcceptedAt: Date | null;
};

export interface ListAnamnesisResponsesFilters {
  customerId?: string;
  serviceTypeId?: string;
  status?: AnamnesisResponseStatus;
}

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

  listByOrg(
    orgId: string,
    filters: ListAnamnesisResponsesFilters,
  ): Promise<AnamnesisResponseListItem[]>;

  findDetailById(
    id: string,
    orgId: string,
  ): Promise<AnamnesisResponseDetail | null>;

  linkCustomer(
    responseId: string,
    customerId: string,
    orgId: string,
  ): Promise<void>;
}
