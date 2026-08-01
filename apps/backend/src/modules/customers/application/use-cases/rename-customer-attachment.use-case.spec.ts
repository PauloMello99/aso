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
  it("compõe o fileName com a extensão do storagePath, ignorando qualquer extensão no baseName", async () => {
    const existing = buildAttachment();
    const renamed = buildAttachment({ fileName: "novo-nome.pdf" });
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(existing),
      updateFileName: jest.fn().mockResolvedValue(renamed),
    });
    const useCase = new RenameCustomerAttachmentUseCase(repo);

    const result = await useCase.execute(
      "attachment-1",
      "customer-1",
      "org-1",
      "novo-nome",
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

  it("não permite remover a extensão mesmo que o baseName venha vazio de extensão", async () => {
    const existing = buildAttachment({
      storagePath: "org-1/customer-1/uuid_original.png",
    });
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(existing),
      updateFileName: jest
        .fn()
        .mockResolvedValue(
          buildAttachment({
            fileName: "sem-extensao-no-input.png",
            storagePath: "org-1/customer-1/uuid_original.png",
          }),
        ),
    });
    const useCase = new RenameCustomerAttachmentUseCase(repo);

    await useCase.execute(
      "attachment-1",
      "customer-1",
      "org-1",
      "sem-extensao-no-input",
    );

    expect(repo.updateFileName).toHaveBeenCalledWith(
      "attachment-1",
      "customer-1",
      "org-1",
      "sem-extensao-no-input.png",
    );
  });

  it("conserta anexo legado sem extensão no storage_path (fica sem extensão, mas não regride)", async () => {
    const existing = buildAttachment({
      storagePath: "org-1/customer-1/uuid_semextensao",
    });
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(existing),
      updateFileName: jest
        .fn()
        .mockResolvedValue(buildAttachment({ fileName: "novo-nome" })),
    });
    const useCase = new RenameCustomerAttachmentUseCase(repo);

    await useCase.execute(
      "attachment-1",
      "customer-1",
      "org-1",
      "novo-nome",
    );

    expect(repo.updateFileName).toHaveBeenCalledWith(
      "attachment-1",
      "customer-1",
      "org-1",
      "novo-nome",
    );
  });

  it("lança CustomerAttachmentNotFoundException quando o anexo não existe na org", async () => {
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const useCase = new RenameCustomerAttachmentUseCase(repo);

    await expect(
      useCase.execute("attachment-1", "customer-1", "org-1", "novo-nome"),
    ).rejects.toBeInstanceOf(CustomerAttachmentNotFoundException);
    expect(repo.updateFileName).not.toHaveBeenCalled();
  });

  it("lança CustomerAttachmentNotFoundException quando o anexo pertence a outro cliente", async () => {
    const existing = buildAttachment({ customerId: "outro-cliente" });
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(existing),
    });
    const useCase = new RenameCustomerAttachmentUseCase(repo);

    await expect(
      useCase.execute("attachment-1", "customer-1", "org-1", "novo-nome"),
    ).rejects.toBeInstanceOf(CustomerAttachmentNotFoundException);
    expect(repo.updateFileName).not.toHaveBeenCalled();
  });

  it("lança CustomerAttachmentNotFoundException quando updateFileName retorna null (corrida com delete)", async () => {
    const existing = buildAttachment();
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(existing),
      updateFileName: jest.fn().mockResolvedValue(null),
    });
    const useCase = new RenameCustomerAttachmentUseCase(repo);

    await expect(
      useCase.execute("attachment-1", "customer-1", "org-1", "novo-nome"),
    ).rejects.toBeInstanceOf(CustomerAttachmentNotFoundException);
  });
});
