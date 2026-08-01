import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import { Inject, Injectable } from "@nestjs/common";
import {
  IStorageProvider,
  STORAGE_PROVIDER,
} from "../../../auth/application/ports/storage-provider.interface";
import {
  CUSTOMER_ATTACHMENT_REPOSITORY,
  CustomerAttachmentRecord,
  ICustomerAttachmentRepository,
} from "../../domain/customer-attachment.repository.interface";
import {
  CUSTOMER_REPOSITORY,
  ICustomerRepository,
} from "../../domain/customer.repository.interface";
import { CustomerNotFoundException } from "../../domain/exceptions/customer-not-found.exception";
import { CustomerAttachmentNotFoundException } from "../../domain/exceptions/customer-attachment-not-found.exception";
import { extensionOf, joinFileName } from "../../../../common/lib/file-name";

export const CUSTOMER_FILES_BUCKET = "customer-files";

export interface AttachmentView extends CustomerAttachmentRecord {
  url: string;
  downloadUrl: string;
}

@Injectable()
export class UploadCustomerAttachmentUseCase {
  constructor(
    @Inject(CUSTOMER_ATTACHMENT_REPOSITORY)
    private readonly repo: ICustomerAttachmentRepository,
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: ICustomerRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
  ) {}

  async execute(input: {
    orgId: string;
    customerId: string;
    fileName: string;
    baseName?: string;
    contentType: string;
    file: Buffer;
    uploadedBy: string | null;
  }): Promise<CustomerAttachmentRecord> {
    const customer = await this.customerRepo.findById(
      input.customerId,
      input.orgId,
    );
    if (!customer) throw new CustomerNotFoundException(input.customerId);

    const fileName = input.baseName
      ? joinFileName(input.baseName, extensionOf(input.fileName))
      : input.fileName;

    const safeName = fileName.replace(/[^\w.-]+/g, "_").slice(-80);
    const path = `${input.orgId}/${input.customerId}/${randomUUID()}_${safeName}`;
    await this.storage.uploadFile(
      CUSTOMER_FILES_BUCKET,
      path,
      input.file,
      input.contentType,
    );

    return this.repo.create({
      orgId: input.orgId,
      customerId: input.customerId,
      storagePath: path,
      fileName,
      contentType: input.contentType,
      uploadedBy: input.uploadedBy,
    });
  }
}

@Injectable()
export class ListCustomerAttachmentsUseCase {
  constructor(
    @Inject(CUSTOMER_ATTACHMENT_REPOSITORY)
    private readonly repo: ICustomerAttachmentRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
  ) {}

  async execute(
    customerId: string,
    orgId: string,
  ): Promise<AttachmentView[]> {
    const items = await this.repo.findByCustomer(customerId, orgId);
    if (items.length === 0) return [];

    const downloadFileNameByPath: Record<string, string> = {};
    for (const a of items) downloadFileNameByPath[a.storagePath] = a.fileName;

    const signed = await this.storage.createSignedFileUrls(
      CUSTOMER_FILES_BUCKET,
      items.map((a) => a.storagePath),
      { downloadFileNameByPath },
    );

    return items
      .filter((a) => signed[a.storagePath])
      .map((a) => ({
        ...a,
        url: signed[a.storagePath]!.url,
        downloadUrl: signed[a.storagePath]!.downloadUrl,
      }));
  }
}

@Injectable()
export class DeleteCustomerAttachmentUseCase {
  constructor(
    @Inject(CUSTOMER_ATTACHMENT_REPOSITORY)
    private readonly repo: ICustomerAttachmentRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
  ) {}

  async execute(id: string, orgId: string): Promise<void> {
    const att = await this.repo.findById(id, orgId);
    if (!att) return;
    await this.storage.removeFile(CUSTOMER_FILES_BUCKET, att.storagePath);
    await this.repo.delete(id, orgId);
  }
}

@Injectable()
export class RenameCustomerAttachmentUseCase {
  constructor(
    @Inject(CUSTOMER_ATTACHMENT_REPOSITORY)
    private readonly repo: ICustomerAttachmentRepository,
  ) {}

  async execute(
    id: string,
    customerId: string,
    orgId: string,
    baseName: string,
  ): Promise<CustomerAttachmentRecord> {
    const existing = await this.repo.findById(id, orgId);
    if (!existing || existing.customerId !== customerId) {
      throw new CustomerAttachmentNotFoundException(id);
    }

    const fileName = joinFileName(
      baseName,
      extensionOf(basename(existing.storagePath)),
    );

    const att = await this.repo.updateFileName(
      id,
      customerId,
      orgId,
      fileName,
    );
    if (!att) throw new CustomerAttachmentNotFoundException(id);
    return att;
  }
}
