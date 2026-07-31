import {
  DeleteServiceMediaUseCase,
  ListServiceMediaUseCase,
  UploadServiceMediaUseCase,
} from "./service-media.use-cases";
import {
  IServiceMediaRepository,
  ServiceMediaRecord,
} from "../../domain/service-media.repository.interface";
import { IServiceRepository } from "../../domain/service.repository.interface";
import { ServiceEntity } from "../../domain/service.entity";
import { IStorageProvider } from "../../../auth/application/ports/storage-provider.interface";
import { ServiceNotFoundException } from "../../domain/exceptions/service-not-found.exception";
import { ServiceMediaLimitExceededException } from "../../domain/exceptions/service-media-limit-exceeded.exception";

function buildService(
  overrides: Partial<Parameters<typeof ServiceEntity.create>[0]> = {},
): ServiceEntity {
  return ServiceEntity.create({
    id: "service-1",
    orgId: "org-1",
    serviceTypeId: null,
    customerId: null,
    paymentTransactionId: null,
    anamnesisResponseId: null,
    performedBy: "user-1",
    createdBy: "user-1",
    description: null,
    amountCents: 10000,
    paymentMethod: "cash",
    performedAt: new Date("2026-07-01T10:00:00Z"),
    canceledAt: null,
    createdAt: new Date("2026-07-01T10:00:00Z"),
    updatedAt: new Date("2026-07-01T10:00:00Z"),
    ...overrides,
  });
}

function buildMediaRecord(
  overrides: Partial<ServiceMediaRecord> = {},
): ServiceMediaRecord {
  return {
    id: "media-1",
    orgId: "org-1",
    serviceId: "service-1",
    storagePath: "org-1/service-1/media-1_foto.png",
    fileName: "foto.png",
    contentType: "image/png",
    createdAt: new Date("2026-07-01T10:00:00Z"),
    ...overrides,
  };
}

function buildMediaRepo(
  overrides: Partial<jest.Mocked<IServiceMediaRepository>> = {},
): jest.Mocked<IServiceMediaRepository> {
  return {
    findByService: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    countByService: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IServiceMediaRepository>;
}

function buildServiceRepo(
  overrides: Partial<jest.Mocked<IServiceRepository>> = {},
): jest.Mocked<IServiceRepository> {
  return {
    findById: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IServiceRepository>;
}

function buildStorage(
  overrides: Partial<jest.Mocked<IStorageProvider>> = {},
): jest.Mocked<IStorageProvider> {
  return {
    uploadAvatar: jest.fn(),
    uploadFile: jest.fn(),
    createSignedUrl: jest.fn(),
    createSignedFileUrls: jest.fn(),
    removeFile: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IStorageProvider>;
}

describe("UploadServiceMediaUseCase", () => {
  it("lança ServiceNotFoundException quando o serviço não existe na org", async () => {
    const mediaRepo = buildMediaRepo();
    const serviceRepo = buildServiceRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const storage = buildStorage();
    const useCase = new UploadServiceMediaUseCase(
      mediaRepo,
      serviceRepo,
      storage,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        serviceId: "missing",
        fileName: "foto.png",
        contentType: "image/png",
        file: Buffer.from("x"),
        uploadedBy: "user-1",
      }),
    ).rejects.toBeInstanceOf(ServiceNotFoundException);
  });

  it("lança ServiceMediaLimitExceededException quando o serviço já tem 3 mídias", async () => {
    const mediaRepo = buildMediaRepo({
      countByService: jest.fn().mockResolvedValue(3),
    });
    const serviceRepo = buildServiceRepo({
      findById: jest.fn().mockResolvedValue(buildService()),
    });
    const storage = buildStorage();
    const useCase = new UploadServiceMediaUseCase(
      mediaRepo,
      serviceRepo,
      storage,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        serviceId: "service-1",
        fileName: "foto.png",
        contentType: "image/png",
        file: Buffer.from("x"),
        uploadedBy: "user-1",
      }),
    ).rejects.toBeInstanceOf(ServiceMediaLimitExceededException);
    expect(mediaRepo.create).not.toHaveBeenCalled();
  });

  it("faz upload e cria o registro quando abaixo do limite", async () => {
    const created = buildMediaRecord();
    const mediaRepo = buildMediaRepo({
      countByService: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockResolvedValue(created),
    });
    const serviceRepo = buildServiceRepo({
      findById: jest.fn().mockResolvedValue(buildService()),
    });
    const storage = buildStorage({
      uploadFile: jest.fn().mockResolvedValue("path"),
    });
    const useCase = new UploadServiceMediaUseCase(
      mediaRepo,
      serviceRepo,
      storage,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      serviceId: "service-1",
      fileName: "foto.png",
      contentType: "image/png",
      file: Buffer.from("x"),
      uploadedBy: "user-1",
    });

    expect(storage.uploadFile).toHaveBeenCalledWith(
      "service-media",
      expect.stringContaining("org-1/service-1/"),
      expect.any(Buffer),
      "image/png",
    );
    expect(result).toBe(created);
  });
});

describe("ListServiceMediaUseCase", () => {
  it("anota cada item com url (inline) e downloadUrl via assinatura em lote", async () => {
    const record = buildMediaRecord();
    const mediaRepo = buildMediaRepo({
      findByService: jest.fn().mockResolvedValue([record]),
    });
    const storage = buildStorage({
      createSignedFileUrls: jest.fn().mockResolvedValue({
        [record.storagePath]: {
          url: "https://signed.example/x",
          downloadUrl: "https://signed.example/x?download=foto.png",
        },
      }),
    });
    const useCase = new ListServiceMediaUseCase(mediaRepo, storage);

    const result = await useCase.execute("service-1", "org-1");

    expect(storage.createSignedFileUrls).toHaveBeenCalledWith(
      "service-media",
      [record.storagePath],
      {
        downloadFileNameByPath: { [record.storagePath]: record.fileName },
      },
    );
    expect(result).toEqual([
      {
        ...record,
        url: "https://signed.example/x",
        downloadUrl: "https://signed.example/x?download=foto.png",
      },
    ]);
  });

  it("retorna lista vazia sem chamar o storage quando não há mídia", async () => {
    const mediaRepo = buildMediaRepo({
      findByService: jest.fn().mockResolvedValue([]),
    });
    const storage = buildStorage();
    const useCase = new ListServiceMediaUseCase(mediaRepo, storage);

    const result = await useCase.execute("service-1", "org-1");

    expect(result).toEqual([]);
    expect(storage.createSignedFileUrls).not.toHaveBeenCalled();
  });
});

describe("DeleteServiceMediaUseCase", () => {
  it("é idempotente quando o registro não existe", async () => {
    const mediaRepo = buildMediaRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const storage = buildStorage();
    const useCase = new DeleteServiceMediaUseCase(mediaRepo, storage);

    await useCase.execute("missing", "org-1");

    expect(storage.removeFile).not.toHaveBeenCalled();
    expect(mediaRepo.delete).not.toHaveBeenCalled();
  });

  it("remove do storage e do repositório quando o registro existe", async () => {
    const record = buildMediaRecord();
    const mediaRepo = buildMediaRepo({
      findById: jest.fn().mockResolvedValue(record),
    });
    const storage = buildStorage();
    const useCase = new DeleteServiceMediaUseCase(mediaRepo, storage);

    await useCase.execute(record.id, "org-1");

    expect(storage.removeFile).toHaveBeenCalledWith(
      "service-media",
      record.storagePath,
    );
    expect(mediaRepo.delete).toHaveBeenCalledWith(record.id, "org-1");
  });
});
