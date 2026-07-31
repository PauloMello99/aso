import { RenameCustomerAttachmentUseCase } from "./customer-attachments.use-cases";
import {
  CustomerAttachmentRecord,
  ICustomerAttachmentRepository,
} from "../../domain/customer-attachment.repository.interface";
import { CustomerAttachmentNotFoundException } from "../../domain/exceptions/customer-attachment-not-found.exception";

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

describe("RenameCustomerAttachmentUseCase", () => {
  it("atualiza o fileName mantendo o storagePath intocado", async () => {
    const renamed = buildAttachment({ fileName: "novo-nome.pdf" });
    const repo = buildFakeRepo({
      updateFileName: jest.fn().mockResolvedValue(renamed),
    });
    const useCase = new RenameCustomerAttachmentUseCase(repo);

    const result = await useCase.execute(
      "attachment-1",
      "customer-1",
      "org-1",
      "novo-nome.pdf",
    );

    expect(repo.updateFileName).toHaveBeenCalledWith(
      "attachment-1",
      "customer-1",
      "org-1",
      "novo-nome.pdf",
    );
    expect(result.fileName).toBe("novo-nome.pdf");
    expect(result.storagePath).toBe("org-1/customer-1/uuid_original.pdf");
  });

  it("faz trim do fileName antes de persistir", async () => {
    const renamed = buildAttachment({ fileName: "nome com espaco.pdf" });
    const repo = buildFakeRepo({
      updateFileName: jest.fn().mockResolvedValue(renamed),
    });
    const useCase = new RenameCustomerAttachmentUseCase(repo);

    await useCase.execute(
      "attachment-1",
      "customer-1",
      "org-1",
      "  nome com espaco.pdf  ",
    );

    expect(repo.updateFileName).toHaveBeenCalledWith(
      "attachment-1",
      "customer-1",
      "org-1",
      "nome com espaco.pdf",
    );
  });

  it("lança CustomerAttachmentNotFoundException quando o anexo não existe/não pertence ao cliente/org", async () => {
    const repo = buildFakeRepo({
      updateFileName: jest.fn().mockResolvedValue(null),
    });
    const useCase = new RenameCustomerAttachmentUseCase(repo);

    await expect(
      useCase.execute("attachment-1", "customer-1", "org-1", "novo-nome.pdf"),
    ).rejects.toBeInstanceOf(CustomerAttachmentNotFoundException);
  });
});
