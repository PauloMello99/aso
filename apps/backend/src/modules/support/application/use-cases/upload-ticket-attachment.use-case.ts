import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  IStorageProvider,
  STORAGE_PROVIDER,
} from "../../../auth/application/ports/storage-provider.interface";
import {
  ITicketRepository,
  TICKET_REPOSITORY,
} from "../../domain/ticket.repository.interface";
import {
  ITicketAttachmentRepository,
  TICKET_ATTACHMENT_REPOSITORY,
  TicketAttachmentRecord,
} from "../../domain/ticket-attachment.repository.interface";
import { TicketNotFoundException } from "../../domain/exceptions/ticket-not-found.exception";
import { TicketAttachmentInvalidException } from "../../domain/exceptions/ticket-attachment-invalid.exception";

export const TICKET_ATTACHMENT_BUCKET = "support-attachments";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
]);

export interface UploadTicketAttachmentInput {
  orgId: string;
  ticketId: string;
  uploadedBy: string;
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
}

@Injectable()
export class UploadTicketAttachmentUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepo: ITicketRepository,
    @Inject(TICKET_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepo: ITicketAttachmentRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
  ) {}

  async execute(
    input: UploadTicketAttachmentInput,
  ): Promise<TicketAttachmentRecord> {
    const ticket = await this.ticketRepo.findByIdInOrg(
      input.ticketId,
      input.orgId,
    );
    if (!ticket) {
      throw new TicketNotFoundException(input.ticketId);
    }

    if (input.file.size > MAX_FILE_SIZE_BYTES) {
      throw new TicketAttachmentInvalidException(
        `File too large: max ${MAX_FILE_SIZE_BYTES} bytes`,
      );
    }
    if (!ALLOWED_MIME_TYPES.has(input.file.mimetype)) {
      throw new TicketAttachmentInvalidException(
        `Unsupported file type: ${input.file.mimetype}`,
      );
    }

    const sanitizedFileName = input.file.originalname
      .replace(/[^\w.-]+/g, "_")
      .slice(-100);
    const storagePath = `${input.orgId}/${input.ticketId}/${randomUUID()}-${sanitizedFileName}`;

    await this.storage.uploadFile(
      TICKET_ATTACHMENT_BUCKET,
      storagePath,
      input.file.buffer,
      input.file.mimetype,
    );

    return this.attachmentRepo.createAsAdmin({
      ticketId: input.ticketId,
      responseId: null,
      orgId: input.orgId,
      storagePath,
      fileName: input.file.originalname,
      mimeType: input.file.mimetype,
      sizeBytes: input.file.size,
      uploadedBy: input.uploadedBy,
    });
  }
}
