import { createHash, randomUUID } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  IAnamnesisResponseRepository,
  ANAMNESIS_RESPONSE_REPOSITORY,
} from "../../domain/anamnesis-response.repository.interface";
import type { AnamnesisAnswer } from "../../domain/anamnesis-response.entity";
import { AnamnesisResponseNotFoundException } from "../../domain/exceptions/anamnesis-response-not-found.exception";
import { AnamnesisResponseAlreadySubmittedException } from "../../domain/exceptions/anamnesis-response-already-submitted.exception";
import { AnamnesisResponseExpiredException } from "../../domain/exceptions/anamnesis-response-expired.exception";
import { AnamnesisSignatureRequiredException } from "../../domain/exceptions/anamnesis-signature-required.exception";
import { AnamnesisConsentRequiredException } from "../../domain/exceptions/anamnesis-consent-required.exception";
import { validateAnamnesisAnswers } from "../../domain/validate-anamnesis-answers";
import { buildAnamnesisConsentText } from "../../domain/build-anamnesis-consent-text";
import {
  ANAMNESIS_DOCUMENT_GENERATOR,
  IAnamnesisDocumentGenerator,
} from "../../domain/ports/anamnesis-document-generator.port";
import {
  IStorageProvider,
  STORAGE_PROVIDER,
} from "../../../auth/application/ports/storage-provider.interface";
import { MailService } from "../../../mail/application/mail.service";

export const ANAMNESIS_DOCUMENTS_BUCKET = "anamnesis-documents";

const PNG_MAGIC_NUMBER = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

export interface SubmitAnamnesisResponseInput {
  token: string;
  answers: AnamnesisAnswer[];
  signerFullName: string;
  signerCpf: string | null;
  signatureImageBase64: string;
  requestIp: string | null;
  requestUserAgent: string | null;
  consentAccepted: boolean;
  consentVersion: string;
}

@Injectable()
export class SubmitAnamnesisResponseUseCase {
  private readonly logger = new Logger(SubmitAnamnesisResponseUseCase.name);

  constructor(
    @Inject(ANAMNESIS_RESPONSE_REPOSITORY)
    private readonly responseRepo: IAnamnesisResponseRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
    @Inject(ANAMNESIS_DOCUMENT_GENERATOR)
    private readonly documentGenerator: IAnamnesisDocumentGenerator,
    private readonly mail: MailService,
  ) {}

  async execute(input: SubmitAnamnesisResponseInput): Promise<void> {
    const response = await this.responseRepo.findByToken(input.token);
    if (!response) throw new AnamnesisResponseNotFoundException(input.token);

    if (response.displayStatus === "submitted") {
      throw new AnamnesisResponseAlreadySubmittedException();
    }
    if (response.isExpired) {
      throw new AnamnesisResponseExpiredException();
    }

    const consent = buildAnamnesisConsentText({
      orgName: response.organizationName,
    });
    if (!input.consentAccepted || input.consentVersion !== consent.version) {
      throw new AnamnesisConsentRequiredException();
    }

    const normalizedAnswers = validateAnamnesisAnswers(
      response.questionsSnapshot,
      input.answers,
    );

    const base64Payload = input.signatureImageBase64.replace(
      /^data:image\/png;base64,/,
      "",
    );
    const signatureBuffer = Buffer.from(base64Payload, "base64");
    if (
      signatureBuffer.length === 0 ||
      !signatureBuffer.subarray(0, 4).equals(PNG_MAGIC_NUMBER)
    ) {
      throw new AnamnesisSignatureRequiredException(response.id);
    }

    const canonicalQuestions = response.questionsSnapshot.map((question) => ({
      id: question.id,
      type: question.type,
      label: question.label,
      required: question.required,
    }));
    const formHash = createHash("sha256")
      .update(JSON.stringify(canonicalQuestions))
      .digest("hex");

    const signedAt = new Date();
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await this.documentGenerator.generate({
        questionsSnapshot: response.questionsSnapshot,
        answers: normalizedAnswers,
        signerFullName: input.signerFullName,
        signerCpf: input.signerCpf,
        signaturePng: signatureBuffer,
        signedAt,
        responseId: response.id,
        formVersionId: response.formVersionId,
        formHash,
        requestIp: input.requestIp,
        requestUserAgent: input.requestUserAgent,
        consentText: consent.text,
        consentVersion: consent.version,
        consentAcceptedAt: signedAt,
      });
    } catch {
      throw new AnamnesisSignatureRequiredException(response.id);
    }
    const pdfHashSha256 = createHash("sha256")
      .update(pdfBuffer)
      .digest("hex");

    const attempt = randomUUID();
    const signaturePath = `${response.orgId}/${response.id}/${attempt}-signature.png`;
    const pdfPath = `${response.orgId}/${response.id}/${attempt}-signed-form.pdf`;
    await this.storage.uploadFile(
      ANAMNESIS_DOCUMENTS_BUCKET,
      signaturePath,
      signatureBuffer,
      "image/png",
    );
    await this.storage.uploadFile(
      ANAMNESIS_DOCUMENTS_BUCKET,
      pdfPath,
      pdfBuffer,
      "application/pdf",
    );

    const claimed = await this.responseRepo.markSubmitted(response.id, {
      answers: normalizedAnswers,
      signerFullName: input.signerFullName,
      signerCpf: input.signerCpf,
      signatureStoragePath: signaturePath,
      pdfStoragePath: pdfPath,
      pdfHashSha256,
      requestIp: input.requestIp,
      requestUserAgent: input.requestUserAgent,
      consentTextSnapshot: consent.text,
      consentVersion: consent.version,
      consentAcceptedAt: signedAt,
    });
    if (!claimed) {
      throw new AnamnesisResponseAlreadySubmittedException();
    }

    if (response.customerEmail) {
      try {
        const signedUrl = await this.storage.createSignedUrl(
          ANAMNESIS_DOCUMENTS_BUCKET,
          pdfPath,
          604_800,
          "ficha-anamnese.pdf",
        );
        await this.mail.sendSignedAnamnesisResponseCopy({
          to: response.customerEmail,
          customerName: input.signerFullName,
          pdfUrl: signedUrl,
        });
      } catch (err) {
        this.logger.error(
          `Falha ao enviar cópia da ficha assinada (response ${response.id}): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }
}
