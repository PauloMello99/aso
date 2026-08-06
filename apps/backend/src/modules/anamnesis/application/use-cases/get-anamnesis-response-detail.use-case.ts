import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  IAnamnesisResponseRepository,
  ANAMNESIS_RESPONSE_REPOSITORY,
} from "../../domain/anamnesis-response.repository.interface";
import { AnamnesisResponseNotFoundException } from "../../domain/exceptions/anamnesis-response-not-found.exception";
import {
  IStorageProvider,
  STORAGE_PROVIDER,
} from "../../../auth/application/ports/storage-provider.interface";
import { ANAMNESIS_DOCUMENTS_BUCKET } from "./submit-anamnesis-response.use-case";
import type {
  AnamnesisAnswer,
  AnamnesisResponseStatus,
} from "../../domain/anamnesis-response.entity";
import type { AnamnesisQuestion } from "../../domain/anamnesis-question";

export interface GetAnamnesisResponseDetailInput {
  id: string;
  orgId: string;
}

export interface AnamnesisResponseDetailResult {
  id: string;
  orgId: string;
  formVersionId: string | null;
  serviceTypeId: string | null;
  customerId: string | null;
  customerName: string | null;
  serviceTypeName: string | null;
  versionNumber: number | null;
  questionsSnapshot: AnamnesisQuestion[];
  status: AnamnesisResponseStatus | "expired";
  answers: AnamnesisAnswer[] | null;
  submittedAt: Date | null;
  createdAt: Date;
  signerFullName: string | null;
  signerCpf: string | null;
  consentTextSnapshot: string | null;
  consentAcceptedAt: Date | null;
  pdfUrl: string | null;
  signatureUrl: string | null;
}

const SIGNED_URL_TTL_SECONDS = 300;

@Injectable()
export class GetAnamnesisResponseDetailUseCase {
  private readonly logger = new Logger(GetAnamnesisResponseDetailUseCase.name);

  constructor(
    @Inject(ANAMNESIS_RESPONSE_REPOSITORY)
    private readonly responseRepo: IAnamnesisResponseRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
  ) {}

  async execute(
    input: GetAnamnesisResponseDetailInput,
  ): Promise<AnamnesisResponseDetailResult> {
    const detail = await this.responseRepo.findDetailById(
      input.id,
      input.orgId,
    );
    if (!detail) {
      throw new AnamnesisResponseNotFoundException(input.id);
    }

    const pdfUrl = await this.createSignedUrlOrNull(detail.pdfStoragePath);
    const signatureUrl = await this.createSignedUrlOrNull(
      detail.signatureStoragePath,
    );

    return {
      id: detail.id,
      orgId: detail.orgId,
      formVersionId: detail.formVersionId,
      serviceTypeId: detail.serviceTypeId,
      customerId: detail.customerId,
      customerName: detail.customerName,
      serviceTypeName: detail.serviceTypeName,
      versionNumber: detail.versionNumber,
      questionsSnapshot: detail.questionsSnapshot,
      status: detail.displayStatus,
      answers: detail.answers,
      submittedAt: detail.submittedAt,
      createdAt: detail.createdAt,
      signerFullName: detail.signerFullName,
      signerCpf: detail.signerCpf,
      consentTextSnapshot: detail.consentTextSnapshot,
      consentAcceptedAt: detail.consentAcceptedAt,
      pdfUrl,
      signatureUrl,
    };
  }

  private async createSignedUrlOrNull(
    path: string | null,
  ): Promise<string | null> {
    if (!path) return null;
    try {
      return await this.storage.createSignedUrl(
        ANAMNESIS_DOCUMENTS_BUCKET,
        path,
        SIGNED_URL_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.error(
        `Falha ao gerar signed URL para ${path}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }
}
