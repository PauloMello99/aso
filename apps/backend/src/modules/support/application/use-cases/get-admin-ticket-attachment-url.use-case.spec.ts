import { GetAdminTicketAttachmentUrlUseCase } from "./get-admin-ticket-attachment-url.use-case";
import {
  ITicketAttachmentRepository,
  TicketAttachmentRecord,
} from "../../domain/ticket-attachment.repository.interface";
import { IStorageProvider } from "../../../auth/application/ports/storage-provider.interface";
import { TicketAttachmentNotFoundException } from "../../domain/exceptions/ticket-attachment-not-found.exception";

function buildAttachment(
  overrides: Partial<TicketAttachmentRecord> = {},
): TicketAttachmentRecord {
  return {
    id: "attachment-1",
    ticketId: "ticket-1",
    responseId: null,
    orgId: null,
    storagePath: "orphan/ticket-1/arquivo.pdf",
    fileName: "arquivo.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1024,
    uploadedBy: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function buildFakeAttachmentRepo(
  overrides: Partial<jest.Mocked<ITicketAttachmentRepository>> = {},
): jest.Mocked<ITicketAttachmentRepository> {
  return {
    createAsAdmin: jest.fn(),
    listByTicketInOrg: jest.fn(),
    listByTicketAsAdmin: jest.fn(),
    findByIdInOrg: jest.fn(),
    findByIdAsAdmin: jest.fn().mockResolvedValue(buildAttachment()),
    ...overrides,
  } as unknown as jest.Mocked<ITicketAttachmentRepository>;
}

function buildFakeStorage(
  overrides: Partial<jest.Mocked<IStorageProvider>> = {},
): jest.Mocked<IStorageProvider> {
  return {
    uploadAvatar: jest.fn(),
    uploadFile: jest.fn(),
    createSignedUrl: jest.fn().mockResolvedValue("https://signed.example/url"),
    createSignedFileUrls: jest.fn(),
    removeFile: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IStorageProvider>;
}

describe("GetAdminTicketAttachmentUrlUseCase", () => {
  it("lança TicketAttachmentNotFoundException quando o anexo não existe", async () => {
    const attachmentRepo = buildFakeAttachmentRepo({
      findByIdAsAdmin: jest.fn().mockResolvedValue(null),
    });
    const storage = buildFakeStorage();
    const useCase = new GetAdminTicketAttachmentUrlUseCase(
      attachmentRepo,
      storage,
    );

    await expect(
      useCase.execute({ attachmentId: "attachment-1" }),
    ).rejects.toBeInstanceOf(TicketAttachmentNotFoundException);
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
  });

  it("gera signed URL para anexo de ticket órfão via findByIdAsAdmin", async () => {
    const attachmentRepo = buildFakeAttachmentRepo();
    const storage = buildFakeStorage();
    const useCase = new GetAdminTicketAttachmentUrlUseCase(
      attachmentRepo,
      storage,
    );

    const url = await useCase.execute({ attachmentId: "attachment-1" });

    expect(attachmentRepo.findByIdAsAdmin).toHaveBeenCalledWith("attachment-1");
    expect(storage.createSignedUrl).toHaveBeenCalledWith(
      "support-attachments",
      "orphan/ticket-1/arquivo.pdf",
      300,
    );
    expect(url).toBe("https://signed.example/url");
  });
});
