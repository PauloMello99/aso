import { randomUUID } from "node:crypto";
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

export const CUSTOMER_FILES_BUCKET = "customer-files";

export interface AttachmentView extends CustomerAttachmentRecord {
  url: string;
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
    contentType: string;
    file: Buffer;
    uploadedBy: string | null;
  }): Promise<CustomerAttachmentRecord> {
    const customer = await this.customerRepo.findById(
      input.customerId,
      input.orgId,
    );
    if (!customer) throw new CustomerNotFoundException(input.customerId);

    const safeName = input.fileName.replace(/[^\w.\-]+/g, "_").slice(-80);
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
      fileName: input.fileName,
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
    return Promise.all(
      items.map(async (a) => ({
        ...a,
        url: await this.storage.createSignedUrl(
          CUSTOMER_FILES_BUCKET,
          a.storagePath,
        ),
      })),
    );
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
