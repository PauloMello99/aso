import { Inject, Injectable } from "@nestjs/common";
import {
  IStorageProvider,
  STORAGE_PROVIDER,
} from "../../../auth/application/ports/storage-provider.interface";
import {
  ITicketAttachmentRepository,
  TICKET_ATTACHMENT_REPOSITORY,
} from "../../domain/ticket-attachment.repository.interface";
import { TicketAttachmentNotFoundException } from "../../domain/exceptions/ticket-attachment-not-found.exception";
import { TICKET_ATTACHMENT_BUCKET } from "./upload-ticket-attachment.use-case";

const SIGNED_URL_EXPIRES_IN_SECONDS = 300;

export interface GetTicketAttachmentUrlInput {
  orgId: string;
  attachmentId: string;
}

@Injectable()
export class GetTicketAttachmentUrlUseCase {
  constructor(
    @Inject(TICKET_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepo: ITicketAttachmentRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
  ) {}

  async execute(input: GetTicketAttachmentUrlInput): Promise<string> {
    const attachment = await this.attachmentRepo.findByIdInOrg(
      input.attachmentId,
      input.orgId,
    );
    // Não distingue "não existe" de "existe em outra org" (evita vazar
    // existência) — sempre TicketAttachmentNotFoundException.
    if (!attachment) {
      throw new TicketAttachmentNotFoundException(input.attachmentId);
    }

    return this.storage.createSignedUrl(
      TICKET_ATTACHMENT_BUCKET,
      attachment.storagePath,
      SIGNED_URL_EXPIRES_IN_SECONDS,
    );
  }
}
