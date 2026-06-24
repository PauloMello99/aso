export const CUSTOMER_ATTACHMENT_REPOSITORY = Symbol(
  "CUSTOMER_ATTACHMENT_REPOSITORY",
);

export interface CustomerAttachmentRecord {
  id: string;
  orgId: string;
  customerId: string;
  storagePath: string;
  fileName: string;
  contentType: string | null;
  createdAt: Date;
}

export interface CreateCustomerAttachmentData {
  orgId: string;
  customerId: string;
  storagePath: string;
  fileName: string;
  contentType: string | null;
  uploadedBy: string | null;
}

export interface ICustomerAttachmentRepository {
  findByCustomer(
    customerId: string,
    orgId: string,
  ): Promise<CustomerAttachmentRecord[]>;
  findById(
    id: string,
    orgId: string,
  ): Promise<CustomerAttachmentRecord | null>;
  create(
    data: CreateCustomerAttachmentData,
  ): Promise<CustomerAttachmentRecord>;
  delete(id: string, orgId: string): Promise<void>;
}
