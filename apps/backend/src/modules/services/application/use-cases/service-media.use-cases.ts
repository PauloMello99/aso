import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  IStorageProvider,
  STORAGE_PROVIDER,
} from "../../../auth/application/ports/storage-provider.interface";
import {
  IServiceMediaRepository,
  SERVICE_MEDIA_REPOSITORY,
  ServiceMediaRecord,
} from "../../domain/service-media.repository.interface";
import {
  IServiceRepository,
  SERVICE_REPOSITORY,
} from "../../domain/service.repository.interface";
import { ServiceNotFoundException } from "../../domain/exceptions/service-not-found.exception";
import { ServiceMediaLimitExceededException } from "../../domain/exceptions/service-media-limit-exceeded.exception";

export const SERVICE_MEDIA_BUCKET = "service-media";

const MAX_SERVICE_MEDIA = 3;

export interface ServiceMediaView extends ServiceMediaRecord {
  url: string;
}

@Injectable()
export class UploadServiceMediaUseCase {
  constructor(
    @Inject(SERVICE_MEDIA_REPOSITORY)
    private readonly repo: IServiceMediaRepository,
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
  ) {}

  async execute(input: {
    orgId: string;
    serviceId: string;
    fileName: string;
    contentType: string;
    file: Buffer;
    uploadedBy: string | null;
  }): Promise<ServiceMediaRecord> {
    const service = await this.serviceRepo.findById(
      input.serviceId,
      input.orgId,
    );
    if (!service) throw new ServiceNotFoundException(input.serviceId);

    const existingCount = await this.repo.countByService(
      input.serviceId,
      input.orgId,
    );
    if (existingCount >= MAX_SERVICE_MEDIA) {
      throw new ServiceMediaLimitExceededException(input.serviceId);
    }

    const safeName = input.fileName.replace(/[^\w.-]+/g, "_").slice(-80);
    const path = `${input.orgId}/${input.serviceId}/${randomUUID()}_${safeName}`;
    await this.storage.uploadFile(
      SERVICE_MEDIA_BUCKET,
      path,
      input.file,
      input.contentType,
    );

    return this.repo.create({
      orgId: input.orgId,
      serviceId: input.serviceId,
      storagePath: path,
      fileName: input.fileName,
      contentType: input.contentType,
      uploadedBy: input.uploadedBy,
    });
  }
}

@Injectable()
export class ListServiceMediaUseCase {
  constructor(
    @Inject(SERVICE_MEDIA_REPOSITORY)
    private readonly repo: IServiceMediaRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
  ) {}

  async execute(serviceId: string, orgId: string): Promise<ServiceMediaView[]> {
    const items = await this.repo.findByService(serviceId, orgId);
    return Promise.all(
      items.map(async (m) => ({
        ...m,
        url: await this.storage.createSignedUrl(
          SERVICE_MEDIA_BUCKET,
          m.storagePath,
        ),
      })),
    );
  }
}

@Injectable()
export class DeleteServiceMediaUseCase {
  constructor(
    @Inject(SERVICE_MEDIA_REPOSITORY)
    private readonly repo: IServiceMediaRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
  ) {}

  async execute(id: string, orgId: string): Promise<void> {
    const media = await this.repo.findById(id, orgId);
    if (!media) return;
    await this.storage.removeFile(SERVICE_MEDIA_BUCKET, media.storagePath);
    await this.repo.delete(id, orgId);
  }
}
