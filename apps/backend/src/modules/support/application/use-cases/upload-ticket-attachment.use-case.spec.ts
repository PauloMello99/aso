import {
  UploadTicketAttachmentUseCase,
  UploadTicketAttachmentInput,
} from "./upload-ticket-attachment.use-case";
import { ITicketRepository } from "../../domain/ticket.repository.interface";
import {
  ITicketAttachmentRepository,
  TicketAttachmentRecord,
} from "../../domain/ticket-attachment.repository.interface";
import { IStorageProvider } from "../../../auth/application/ports/storage-provider.interface";
import { TicketEntity } from "../../domain/ticket.entity";
import { TicketNotFoundException } from "../../domain/exceptions/ticket-not-found.exception";
import { TicketAttachmentInvalidException } from "../../domain/exceptions/ticket-attachment-invalid.exception";

function buildTicket(overrides: Partial<TicketEntity> = {}): TicketEntity {
  return TicketEntity.fromProps({
    id: "ticket-1",
    orgId: "org-1",
    categoryId: "category-1",
    createdBy: "user-1",
    requesterName: "Cliente Teste",
    requesterEmail: "cliente@example.com",
    subject: "Problema no sistema",
    description: "Descrição detalhada do problema encontrado no sistema.",
    status: "open",
    priority: "normal",
    assignedAgentId: null,
    firstResponseAt: null,
    resolvedAt: null,
    closedAt: null,
    reopenedAt: null,
    slaFirstResponseDueAt: new Date("2026-01-01T01:00:00Z"),
    slaResolutionDueAt: new Date("2026-01-02T00:00:00Z"),
    slaFirstResponseBreachedAt: null,
    slaResolutionBreachedAt: null,
    slaWarningNotifiedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeTicketRepo(
  overrides: Partial<jest.Mocked<ITicketRepository>> = {},
): jest.Mocked<ITicketRepository> {
  return {
    createAsAdmin: jest.fn(),
    findByIdInOrg: jest.fn().mockResolvedValue(buildTicket()),
    listByOrg: jest.fn(),
    updateAsAdmin: jest.fn(),
    listSlaCandidates: jest.fn(),
    listAllForAdminQueue: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITicketRepository>;
}

function buildFakeAttachmentRepo(
  overrides: Partial<jest.Mocked<ITicketAttachmentRepository>> = {},
): jest.Mocked<ITicketAttachmentRepository> {
  return {
    createAsAdmin: jest.fn(
      (data): Promise<TicketAttachmentRecord> =>
        Promise.resolve({
          id: "attachment-1",
          ticketId: data.ticketId,
          responseId: data.responseId,
          orgId: data.orgId,
          storagePath: data.storagePath,
          fileName: data.fileName,
          mimeType: data.mimeType,
          sizeBytes: data.sizeBytes,
          uploadedBy: data.uploadedBy,
          createdAt: new Date("2026-01-01T00:00:00Z"),
        }),
    ),
    listByTicketInOrg: jest.fn(),
    findByIdInOrg: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITicketAttachmentRepository>;
}

function buildFakeStorageProvider(
  overrides: Partial<jest.Mocked<IStorageProvider>> = {},
): jest.Mocked<IStorageProvider> {
  return {
    uploadAvatar: jest.fn(),
    uploadFile: jest.fn().mockResolvedValue("mocked-path"),
    createSignedUrl: jest.fn(),
    createSignedFileUrls: jest.fn(),
    removeFile: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IStorageProvider>;
}

function buildUseCase(overrides?: {
  ticketRepo?: Partial<jest.Mocked<ITicketRepository>>;
  attachmentRepo?: Partial<jest.Mocked<ITicketAttachmentRepository>>;
  storage?: Partial<jest.Mocked<IStorageProvider>>;
}) {
  const ticketRepo = buildFakeTicketRepo(overrides?.ticketRepo);
  const attachmentRepo = buildFakeAttachmentRepo(overrides?.attachmentRepo);
  const storage = buildFakeStorageProvider(overrides?.storage);
  const useCase = new UploadTicketAttachmentUseCase(
    ticketRepo,
    attachmentRepo,
    storage,
  );
  return { useCase, ticketRepo, attachmentRepo, storage };
}

const baseInput: UploadTicketAttachmentInput = {
  orgId: "org-1",
  ticketId: "ticket-1",
  uploadedBy: "user-1",
  file: {
    buffer: Buffer.from("fake-image-bytes"),
    originalname: "foto.png",
    mimetype: "image/png",
    size: 1024,
  },
};

describe("UploadTicketAttachmentUseCase", () => {
  it("lança TicketNotFoundException quando o ticket não existe na org", async () => {
    const { useCase, attachmentRepo, storage } = buildUseCase({
      ticketRepo: { findByIdInOrg: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      TicketNotFoundException,
    );
    expect(storage.uploadFile).not.toHaveBeenCalled();
    expect(attachmentRepo.createAsAdmin).not.toHaveBeenCalled();
  });

  it("lança TicketAttachmentInvalidException quando o arquivo excede 10MB", async () => {
    const { useCase, storage } = buildUseCase();

    await expect(
      useCase.execute({
        ...baseInput,
        file: { ...baseInput.file, size: 10 * 1024 * 1024 + 1 },
      }),
    ).rejects.toBeInstanceOf(TicketAttachmentInvalidException);
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it("lança TicketAttachmentInvalidException para mime type não permitido", async () => {
    const { useCase, storage } = buildUseCase();

    await expect(
      useCase.execute({
        ...baseInput,
        file: { ...baseInput.file, mimetype: "application/zip" },
      }),
    ).rejects.toBeInstanceOf(TicketAttachmentInvalidException);
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it("faz upload e persiste o anexo com storage_path prefixado por orgId/ticketId", async () => {
    const { useCase, attachmentRepo, storage } = buildUseCase();

    const result = await useCase.execute(baseInput);

    expect(storage.uploadFile).toHaveBeenCalledWith(
      "support-attachments",
      expect.stringMatching(/^org-1\/ticket-1\//),
      baseInput.file.buffer,
      "image/png",
    );
    expect(attachmentRepo.createAsAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        ticketId: "ticket-1",
        fileName: "foto.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        uploadedBy: "user-1",
        storagePath: expect.stringMatching(/^org-1\/ticket-1\//),
      }),
    );

    const uploadOrder = storage.uploadFile.mock.invocationCallOrder[0];
    const createOrder = attachmentRepo.createAsAdmin.mock.invocationCallOrder[0];
    expect(uploadOrder).toBeLessThan(createOrder);

    expect(result.id).toBe("attachment-1");
  });
});
