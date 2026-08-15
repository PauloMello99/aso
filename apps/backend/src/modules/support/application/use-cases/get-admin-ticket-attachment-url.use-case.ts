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

export interface GetAdminTicketAttachmentUrlInput {
  attachmentId: string;
}

/**
 * Equivalente admin de `GetTicketAttachmentUrlUseCase`, mas cross-org: o
 * endpoint do portal (`GET /orgs/:orgId/support/attachments/:id/url`) exige
 * `orgId` na rota, o que o torna inalcançável para anexos de ticket órfão
 * (`org_id` NULL, ver `LinkTicketToOrganizationUseCase`) — a fila admin
 * precisa exibir/baixar esses anexos antes do vínculo à organização
 * acontecer. A fila admin é legitimamente cross-org (mesmo padrão de
 * `GetAdminTicketDetailUseCase`), então a busca usa
 * `findByIdAsAdmin` (DRIZZLE_ADMIN) em vez de `findByIdInOrg`.
 */
@Injectable()
export class GetAdminTicketAttachmentUrlUseCase {
  constructor(
    @Inject(TICKET_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepo: ITicketAttachmentRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
  ) {}

  async execute(input: GetAdminTicketAttachmentUrlInput): Promise<string> {
    const attachment = await this.attachmentRepo.findByIdAsAdmin(
      input.attachmentId,
    );
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
