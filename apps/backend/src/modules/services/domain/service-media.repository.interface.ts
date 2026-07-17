export const SERVICE_MEDIA_REPOSITORY = Symbol("SERVICE_MEDIA_REPOSITORY");

export interface ServiceMediaRecord {
  id: string;
  orgId: string;
  serviceId: string;
  storagePath: string;
  fileName: string;
  contentType: string | null;
  createdAt: Date;
}

export interface CreateServiceMediaData {
  orgId: string;
  serviceId: string;
  storagePath: string;
  fileName: string;
  contentType: string | null;
  uploadedBy: string | null;
}

export interface IServiceMediaRepository {
  findByService(
    serviceId: string,
    orgId: string,
  ): Promise<ServiceMediaRecord[]>;
  findById(id: string, orgId: string): Promise<ServiceMediaRecord | null>;
  create(data: CreateServiceMediaData): Promise<ServiceMediaRecord>;
  delete(id: string, orgId: string): Promise<void>;
  countByService(serviceId: string, orgId: string): Promise<number>;
}
