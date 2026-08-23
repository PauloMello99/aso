import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  IAnamnesisResponseRepository,
  ANAMNESIS_RESPONSE_REPOSITORY,
} from "../../domain/anamnesis-response.repository.interface";
import { AnamnesisResponseNotFoundException } from "../../domain/exceptions/anamnesis-response-not-found.exception";
import { AnamnesisResponseNotSubmittedException } from "../../domain/exceptions/anamnesis-response-not-submitted.exception";
import { AnamnesisDocumentUnavailableException } from "../../domain/exceptions/anamnesis-document-unavailable.exception";
import { AnamnesisDocumentFetchFailedException } from "../../domain/exceptions/anamnesis-document-fetch-failed.exception";
import { AnamnesisResponseNoRecipientException } from "../../domain/exceptions/anamnesis-response-no-recipient.exception";
import { AnamnesisInviteEmailFailedException } from "../../domain/exceptions/anamnesis-invite-email-failed.exception";
import {
  IStorageProvider,
  STORAGE_PROVIDER,
} from "../../../auth/application/ports/storage-provider.interface";
import { ANAMNESIS_DOCUMENTS_BUCKET } from "./submit-anamnesis-response.use-case";
import {
  ICustomerRepository,
  CUSTOMER_REPOSITORY,
} from "../../../customers/domain/customer.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { resolveMembership } from "../../../services/application/use-cases/resolve-membership";
import { MailService } from "../../../mail/application/mail.service";
import { AuditService } from "../../../audit/audit.service";

const SIGNED_URL_TTL_SECONDS = 604_800;
const SIGNED_URL_FILENAME = "ficha-anamnese.pdf";

export interface SendAnamnesisResponseCopyInput {
  orgId: string;
  authId: string;
  responseId: string;
}

export interface SendAnamnesisResponseCopyResult {
  sentTo: string;
}

@Injectable()
export class SendAnamnesisResponseCopyUseCase {
  private readonly logger = new Logger(SendAnamnesisResponseCopyUseCase.name);

  constructor(
    @Inject(ANAMNESIS_RESPONSE_REPOSITORY)
    private readonly responseRepo: IAnamnesisResponseRepository,
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: ICustomerRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
    private readonly mail: MailService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    input: SendAnamnesisResponseCopyInput,
  ): Promise<SendAnamnesisResponseCopyResult> {
    const { userId } = await resolveMembership(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    const detail = await this.responseRepo.findDetailById(
      input.responseId,
      input.orgId,
    );
    if (!detail) {
      throw new AnamnesisResponseNotFoundException(input.responseId);
    }

    if (detail.status !== "submitted") {
      throw new AnamnesisResponseNotSubmittedException();
    }

    if (!detail.customerId) {
      throw new AnamnesisResponseNoRecipientException();
    }

    const customer = await this.customerRepo.findById(
      detail.customerId,
      input.orgId,
    );
    if (!customer || !customer.email) {
      throw new AnamnesisResponseNoRecipientException();
    }

    if (!detail.pdfStoragePath) {
      throw new AnamnesisDocumentUnavailableException();
    }

    let signedUrl: string;
    try {
      signedUrl = await this.storage.createSignedUrl(
        ANAMNESIS_DOCUMENTS_BUCKET,
        detail.pdfStoragePath,
        SIGNED_URL_TTL_SECONDS,
        SIGNED_URL_FILENAME,
      );
    } catch (err) {
      this.logger.error(
        `Falha ao gerar signed URL para ${detail.pdfStoragePath}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new AnamnesisDocumentFetchFailedException();
    }

    try {
      await this.mail.sendSignedAnamnesisResponseCopy({
        to: customer.email,
        customerName: customer.name,
        pdfUrl: signedUrl,
      });
    } catch (err) {
      this.logger.error(
        `Falha ao enviar cópia da ficha assinada (response ${input.responseId}, customer ${detail.customerId}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new AnamnesisInviteEmailFailedException(customer.email);
    }

    await this.auditService.log({
      actorId: userId,
      orgId: input.orgId,
      action: "anamnesis_copy_sent",
      entityType: "anamnesis_response",
      entityId: input.responseId,
      metadata: { customerId: detail.customerId },
    });

    return { sentTo: customer.email };
  }
}
