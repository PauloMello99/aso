import { randomUUID } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  IQuoteFormRepository,
  QUOTE_FORM_REPOSITORY,
} from "../../domain/quote-form.repository.interface";
import {
  CreateQuoteRequestImageData,
  IQuoteRequestRepository,
  QUOTE_REQUEST_REPOSITORY,
} from "../../domain/quote-request.repository.interface";
import {
  IStorageProvider,
  STORAGE_PROVIDER,
} from "../../../auth/application/ports/storage-provider.interface";
import { NotificationService } from "../../../notifications/application/notification.service";
import {
  MAX_QUOTE_IMAGES,
  MAX_QUOTE_IMAGE_BYTES,
  DetectedImageType,
  detectImageType,
} from "../../domain/detect-image-type";
import {
  hasValidQuoteFormSlugFormat,
  normalizeQuoteFormSlug,
} from "../../domain/quote-form-slug";
import {
  QUOTE_CONSENT_VERSION,
  buildQuoteConsentSnapshot,
} from "../../domain/build-quote-consent-text";
import { QuoteFormNotFoundException } from "../../domain/exceptions/quote-form-not-found.exception";
import { QuoteRequestInvalidException } from "../../domain/exceptions/quote-request-invalid.exception";
import { QuoteImageUploadFailedException } from "../../domain/exceptions/quote-image-upload-failed.exception";

export const QUOTE_REQUEST_IMAGES_BUCKET = "quote-request-images";
export const QUOTE_REQUEST_RETENTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SubmitQuoteRequestFile {
  buffer: Buffer;
  size: number;
}

export interface SubmitQuoteRequestInput {
  slug: string;
  name: string;
  phone: string;
  email: string;
  idea: string;
  consentVersion: string;
  privacyConsent: boolean;
  contactRetentionConsent: boolean;
  files: SubmitQuoteRequestFile[];
}

@Injectable()
export class SubmitQuoteRequestUseCase {
  private readonly logger = new Logger(SubmitQuoteRequestUseCase.name);

  constructor(
    @Inject(QUOTE_FORM_REPOSITORY)
    private readonly forms: IQuoteFormRepository,
    @Inject(QUOTE_REQUEST_REPOSITORY)
    private readonly requests: IQuoteRequestRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
    private readonly notifications: NotificationService,
  ) {}

  // O captcha ja foi verificado no QuoteCaptchaGuard (antes do multer).
  async execute(input: SubmitQuoteRequestInput): Promise<void> {
    if (input.privacyConsent !== true) {
      throw new QuoteRequestInvalidException("consent_required");
    }
    if (input.consentVersion !== QUOTE_CONSENT_VERSION) {
      throw new QuoteRequestInvalidException("consent_version");
    }

    const detected = this.validateImages(input.files);

    const slug = normalizeQuoteFormSlug(input.slug);
    if (!hasValidQuoteFormSlugFormat(slug)) {
      throw new QuoteFormNotFoundException();
    }
    const target = await this.forms.findPublicBySlugAsAdmin(slug);
    if (!target) throw new QuoteFormNotFoundException();

    const quoteRequestId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + QUOTE_REQUEST_RETENTION_DAYS * DAY_MS,
    );
    const contactRetentionAccepted = input.contactRetentionConsent === true;

    // Storage primeiro, banco depois: nenhuma linha aponta para imagem inexistente.
    const uploadedPaths: string[] = [];
    const images: CreateQuoteRequestImageData[] = [];
    let failureName = "unknown";
    try {
      for (const [position, file] of input.files.entries()) {
        const type = detected[position]!;
        const storagePath = `${target.orgId}/${quoteRequestId}/${randomUUID()}.${type.ext}`;
        try {
          await this.storage.uploadFile(
            QUOTE_REQUEST_IMAGES_BUCKET,
            storagePath,
            file.buffer,
            type.mime,
          );
        } catch (uploadError) {
          // Qualquer falha do provider (inclusive AvatarUploadFailedException)
          // vira erro proprio, sem repassar a mensagem do provider.
          failureName =
            uploadError instanceof Error ? uploadError.name : "unknown";
          throw new QuoteImageUploadFailedException();
        }
        uploadedPaths.push(storagePath);
        images.push({
          storagePath,
          contentType: type.mime,
          sizeBytes: file.size,
          position,
        });
      }

      await this.requests.createWithImagesAsAdmin(
        {
          id: quoteRequestId,
          orgId: target.orgId,
          targetUserId: target.targetUserId,
          requesterName: input.name.trim(),
          requesterPhone: input.phone,
          requesterEmail: input.email.trim().toLowerCase(),
          idea: input.idea.trim(),
          consentVersion: QUOTE_CONSENT_VERSION,
          consentTextSnapshot: buildQuoteConsentSnapshot({
            orgName: target.orgName,
            contactRetentionAccepted,
          }),
          createdAt: now,
          privacyConsentAcceptedAt: now,
          contactRetentionConsentAcceptedAt: contactRetentionAccepted
            ? now
            : null,
          expiresAt,
        },
        images,
      );
    } catch (error) {
      await this.cleanupUploads(uploadedPaths);
      if (failureName === "unknown" && error instanceof Error) {
        failureName = error.name;
      }
      // Sem PII: so ids, contagem e nome do erro.
      this.logger.error(
        `Failed to store quote request ${quoteRequestId} (org ${target.orgId}, images ${input.files.length}, error ${failureName})`,
      );
      throw error;
    }

    // Fora do try/catch acima de proposito: o pedido ja esta gravado, entao uma
    // falha aqui NUNCA pode acionar o cleanup das imagens (apagaria anexos de um
    // pedido valido) nem fazer o solicitante ver erro.
    await this.notifyTarget(quoteRequestId, target);
  }

  // Best-effort e sem PII: so o profissional destino, in-app (sem e-mail).
  private async notifyTarget(
    quoteRequestId: string,
    target: { orgId: string; targetUserId: string },
  ): Promise<void> {
    try {
      await this.notifications.notify({
        userId: target.targetUserId,
        orgId: target.orgId,
        type: "quote_request_received",
        title: "Novo pedido de orçamento",
        body: "Abra Orçamentos para ver os detalhes.",
        data: { quoteRequestId },
        email: false,
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : "unknown";
      this.logger.warn(
        `Falha ao notificar novo pedido de orcamento ${quoteRequestId} (org ${target.orgId}): ${name}`,
      );
    }
  }

  private validateImages(files: SubmitQuoteRequestFile[]): DetectedImageType[] {
    if (files.length > MAX_QUOTE_IMAGES) {
      throw new QuoteRequestInvalidException("image_count");
    }
    return files.map((file) => {
      if (file.size <= 0 || file.size > MAX_QUOTE_IMAGE_BYTES) {
        throw new QuoteRequestInvalidException("image_size");
      }
      const type = detectImageType(file.buffer);
      if (!type) throw new QuoteRequestInvalidException("image_type");
      return type;
    });
  }

  // Best-effort: cada remocao tem seu try/catch.
  private async cleanupUploads(paths: string[]): Promise<void> {
    for (const path of paths) {
      try {
        await this.storage.removeFile(QUOTE_REQUEST_IMAGES_BUCKET, path);
      } catch {
        // Orfao detectavel pelo prefixo {orgId}/{quoteRequestId}/; sweep em C3.
      }
    }
  }
}
