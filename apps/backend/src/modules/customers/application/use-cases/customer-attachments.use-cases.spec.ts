import {
  ListCustomerAttachmentsUseCase,
  UploadCustomerAttachmentUseCase,
} from "./customer-attachments.use-cases";
import {
  CustomerAttachmentRecord,
  ICustomerAttachmentRepository,
} from "../../domain/customer-attachment.repository.interface";
import { ICustomerRepository } from "../../domain/customer.repository.interface";
import { CustomerEntity } from "../../domain/customer.entity";
import { IStorageProvider } from "../../../auth/application/ports/storage-provider.interface";
import { CustomerNotFoundException } from "../../domain/exceptions/customer-not-found.exception";

function buildAttachment(
  overrides: Partial<CustomerAttachmentRecord> = {},
): CustomerAttachmentRecord {
  return {
    id: "attachment-1",
    orgId: "org-1",
    customerId: "customer-1",
    storagePath: "org-1/customer-1/uuid_original.pdf",
    fileName: "original.pdf",
    contentType: "application/pdf",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function buildFakeRepo(
  overrides: Partial<jest.Mocked<ICustomerAttachmentRepository>> = {},
): jest.Mocked<ICustomerAttachmentRepository> {
  return {
    findByCustomer: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    updateFileName: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ICustomerAttachmentRepository>;
}

function buildCustomerRepo(
  overrides: Partial<jest.Mocked<ICustomerRepository>> = {},
): jest.Mocked<ICustomerRepository> {
  return {
    findById: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ICustomerRepository>;
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

describe("UploadCustomerAttachmentUseCase", () => {
  it("lança CustomerNotFoundException quando o cliente não existe na org", async () => {
    const repo = buildFakeRepo();
    const customerRepo = buildCustomerRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const storage = buildStorage();
    const useCase = new UploadCustomerAttachmentUseCase(
      repo,
      customerRepo,
      storage,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        customerId: "missing",
        fileName: "foto.png",
        contentType: "image/png",
        file: Buffer.from("x"),
        uploadedBy: "user-1",
      }),
    ).rejects.toBeInstanceOf(CustomerNotFoundException);
  });

  it("mantém file.originalname quando baseName não é enviado (retrocompatível)", async () => {
    const repo = buildFakeRepo({
      create: jest.fn().mockResolvedValue(buildAttachment()),
    });
    const customerRepo = buildCustomerRepo({
      findById: jest.fn().mockResolvedValue({} as CustomerEntity),
    });
    const storage = buildStorage({
      uploadFile: jest.fn().mockResolvedValue("path"),
    });
    const useCase = new UploadCustomerAttachmentUseCase(
      repo,
      customerRepo,
      storage,
    );

    await useCase.execute({
      orgId: "org-1",
      customerId: "customer-1",
      fileName: "original.pdf",
      contentType: "application/pdf",
      file: Buffer.from("x"),
      uploadedBy: "user-1",
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: "original.pdf" }),
    );
  });

  it("compõe o fileName com baseName + extensão do arquivo original quando baseName é enviado", async () => {
    const repo = buildFakeRepo({
      create: jest.fn().mockResolvedValue(buildAttachment()),
    });
    const customerRepo = buildCustomerRepo({
      findById: jest.fn().mockResolvedValue({} as CustomerEntity),
    });
    const storage = buildStorage({
      uploadFile: jest.fn().mockResolvedValue("path"),
    });
    const useCase = new UploadCustomerAttachmentUseCase(
      repo,
      customerRepo,
      storage,
    );

    await useCase.execute({
      orgId: "org-1",
      customerId: "customer-1",
      fileName: "original-name-ignored.pdf",
      baseName: "meu-documento",
      contentType: "application/pdf",
      file: Buffer.from("x"),
      uploadedBy: "user-1",
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: "meu-documento.pdf" }),
    );
  });
});

describe("ListCustomerAttachmentsUseCase", () => {
  it("assina em lote e mapeia url/downloadUrl por path, não por índice", async () => {
    const first = buildAttachment({
      id: "attachment-1",
      storagePath: "org-1/customer-1/a.pdf",
      fileName: "a.pdf",
    });
    const second = buildAttachment({
      id: "attachment-2",
      storagePath: "org-1/customer-1/b.png",
      fileName: "b.png",
    });
    const repo = buildFakeRepo({
      findByCustomer: jest.fn().mockResolvedValue([first, second]),
    });
    const storage = buildStorage({
      createSignedFileUrls: jest.fn().mockResolvedValue({
        // resposta em ordem inversa da entrada, propositalmente
        "org-1/customer-1/b.png": {
          url: "https://signed.example/b",
          downloadUrl: "https://signed.example/b?download=b.png",
        },
        "org-1/customer-1/a.pdf": {
          url: "https://signed.example/a",
          downloadUrl: "https://signed.example/a?download=a.pdf",
        },
      }),
    });
    const useCase = new ListCustomerAttachmentsUseCase(repo, storage);

    const result = await useCase.execute("customer-1", "org-1");

    expect(storage.createSignedFileUrls).toHaveBeenCalledWith(
      "customer-files",
      ["org-1/customer-1/a.pdf", "org-1/customer-1/b.png"],
      {
        downloadFileNameByPath: {
          "org-1/customer-1/a.pdf": "a.pdf",
          "org-1/customer-1/b.png": "b.png",
        },
      },
    );
    expect(result).toEqual([
      {
        ...first,
        url: "https://signed.example/a",
        downloadUrl: "https://signed.example/a?download=a.pdf",
      },
      {
        ...second,
        url: "https://signed.example/b",
        downloadUrl: "https://signed.example/b?download=b.png",
      },
    ]);
  });

  it("omite anexos cuja assinatura falhou, sem derrubar os demais", async () => {
    const first = buildAttachment({
      id: "attachment-1",
      storagePath: "org-1/customer-1/a.pdf",
      fileName: "a.pdf",
    });
    const second = buildAttachment({
      id: "attachment-2",
      storagePath: "org-1/customer-1/b.png",
      fileName: "b.png",
    });
    const repo = buildFakeRepo({
      findByCustomer: jest.fn().mockResolvedValue([first, second]),
    });
    const storage = buildStorage({
      createSignedFileUrls: jest.fn().mockResolvedValue({
        "org-1/customer-1/a.pdf": {
          url: "https://signed.example/a",
          downloadUrl: "https://signed.example/a?download=a.pdf",
        },
        // "b.png" ausente = falhou ao assinar
      }),
    });
    const useCase = new ListCustomerAttachmentsUseCase(repo, storage);

    const result = await useCase.execute("customer-1", "org-1");

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("attachment-1");
  });

  it("retorna lista vazia sem chamar o storage quando não há anexos", async () => {
    const repo = buildFakeRepo({
      findByCustomer: jest.fn().mockResolvedValue([]),
    });
    const storage = buildStorage();
    const useCase = new ListCustomerAttachmentsUseCase(repo, storage);

    const result = await useCase.execute("customer-1", "org-1");

    expect(result).toEqual([]);
    expect(storage.createSignedFileUrls).not.toHaveBeenCalled();
  });
});
