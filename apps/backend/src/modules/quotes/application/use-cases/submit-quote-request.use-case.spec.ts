import { Logger } from "@nestjs/common";
import {
  QUOTE_REQUEST_IMAGES_BUCKET,
  SubmitQuoteRequestInput,
  SubmitQuoteRequestUseCase,
} from "./submit-quote-request.use-case";
import { IQuoteFormRepository } from "../../domain/quote-form.repository.interface";
import { IQuoteRequestRepository } from "../../domain/quote-request.repository.interface";
import { IStorageProvider } from "../../../auth/application/ports/storage-provider.interface";
import { QuoteFormNotFoundException } from "../../domain/exceptions/quote-form-not-found.exception";
import { QUOTE_CONSENT_VERSION } from "../../domain/build-quote-consent-text";

function jpegBuffer(): Buffer {
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
}

function pngBuffer(): Buffer {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(32),
  ]);
}

function pdfBuffer(): Buffer {
  return Buffer.concat([Buffer.from("%PDF-1.7"), Buffer.alloc(32)]);
}

function file(buffer: Buffer, size = buffer.length) {
  return { buffer, size };
}

function buildFakeFormRepo(
  overrides: Partial<jest.Mocked<IQuoteFormRepository>> = {},
): jest.Mocked<IQuoteFormRepository> {
  return {
    findMemberContext: jest.fn(),
    findByOrgAndUser: jest.fn(),
    upsertForMember: jest.fn(),
    findPublicBySlugAsAdmin: jest.fn().mockResolvedValue({
      formId: "form-1",
      orgId: "org-1",
      targetUserId: "user-1",
      orgName: "Estudio Ink",
      displayName: "Maria",
    }),
    ...overrides,
  } as unknown as jest.Mocked<IQuoteFormRepository>;
}

function buildFakeRequestRepo(
  overrides: Partial<jest.Mocked<IQuoteRequestRepository>> = {},
): jest.Mocked<IQuoteRequestRepository> {
  return {
    createWithImagesAsAdmin: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as jest.Mocked<IQuoteRequestRepository>;
}

function buildFakeStorage(
  overrides: Partial<jest.Mocked<IStorageProvider>> = {},
): jest.Mocked<IStorageProvider> {
  return {
    uploadFile: jest.fn().mockResolvedValue("path"),
    removeFile: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as jest.Mocked<IStorageProvider>;
}

function buildInput(
  overrides: Partial<SubmitQuoteRequestInput> = {},
): SubmitQuoteRequestInput {
  return {
    slug: "maria",
    name: "Joao Cliente",
    phone: "+5511999998888",
    email: "Joao@Example.com",
    idea: "Um leao no antebraco",
    consentVersion: QUOTE_CONSENT_VERSION,
    privacyConsent: true,
    contactRetentionConsent: false,
    files: [],
    ...overrides,
  };
}

function build(
  forms = buildFakeFormRepo(),
  requests = buildFakeRequestRepo(),
  storage = buildFakeStorage(),
) {
  return {
    forms,
    requests,
    storage,
    useCase: new SubmitQuoteRequestUseCase(forms, requests, storage),
  };
}

describe("SubmitQuoteRequestUseCase", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("stores a request without images", async () => {
    const { useCase, requests, storage } = build();
    await useCase.execute(buildInput());
    expect(storage.uploadFile).not.toHaveBeenCalled();
    const [request, images] = requests.createWithImagesAsAdmin.mock.calls[0]!;
    expect(images).toEqual([]);
    expect(request).toMatchObject({
      orgId: "org-1",
      targetUserId: "user-1",
      requesterEmail: "joao@example.com",
      consentVersion: QUOTE_CONSENT_VERSION,
    });
  });

  it("uploads up to 3 images using the detected mime, not the client's", async () => {
    const { useCase, requests, storage } = build();
    await useCase.execute(
      buildInput({
        files: [file(jpegBuffer()), file(pngBuffer()), file(jpegBuffer())],
      }),
    );
    const calls = storage.uploadFile.mock.calls;
    expect(calls).toHaveLength(3);
    expect(calls[0]![0]).toBe(QUOTE_REQUEST_IMAGES_BUCKET);
    expect(calls[0]![1]).toMatch(/^org-1\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/);
    expect(calls[0]![3]).toBe("image/jpeg");
    expect(calls[1]![3]).toBe("image/png");
    const images = requests.createWithImagesAsAdmin.mock.calls[0]![1];
    expect(images.map((i) => i.position)).toEqual([0, 1, 2]);
    expect(images[1]!.contentType).toBe("image/png");
  });

  it("rejects 4 images", async () => {
    const { useCase, storage } = build();
    const f = file(jpegBuffer());
    await expect(
      useCase.execute(buildInput({ files: [f, f, f, f] })),
    ).rejects.toMatchObject({ details: { reason: "image_count" } });
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it("rejects a file with PDF bytes without uploading", async () => {
    const { useCase, storage } = build();
    await expect(
      useCase.execute(buildInput({ files: [file(pdfBuffer())] })),
    ).rejects.toMatchObject({ details: { reason: "image_type" } });
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it("rejects an image larger than 5 MB", async () => {
    const { useCase, storage } = build();
    await expect(
      useCase.execute(
        buildInput({ files: [file(jpegBuffer(), 5 * 1024 * 1024 + 1)] }),
      ),
    ).rejects.toMatchObject({ details: { reason: "image_size" } });
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it("rejects without privacy consent", async () => {
    const { useCase, forms } = build();
    await expect(
      useCase.execute(buildInput({ privacyConsent: false })),
    ).rejects.toMatchObject({ details: { reason: "consent_required" } });
    expect(forms.findPublicBySlugAsAdmin).not.toHaveBeenCalled();
  });

  it("rejects a divergent consent version", async () => {
    const { useCase } = build();
    await expect(
      useCase.execute(buildInput({ consentVersion: "old" })),
    ).rejects.toMatchObject({ details: { reason: "consent_version" } });
  });

  it("throws not found for an unknown slug without uploading", async () => {
    const forms = buildFakeFormRepo({
      findPublicBySlugAsAdmin: jest.fn().mockResolvedValue(null),
    });
    const { useCase, storage } = build(forms);
    await expect(
      useCase.execute(buildInput({ files: [file(jpegBuffer())] })),
    ).rejects.toBeInstanceOf(QuoteFormNotFoundException);
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it("maps any upload failure to QUOTE_IMAGE_UPLOAD_FAILED without provider text", async () => {
    const storage = buildFakeStorage({
      uploadFile: jest
        .fn()
        .mockRejectedValue(new Error("database error, code: 42P10")),
    });
    const { useCase } = build(undefined, undefined, storage);
    const promise = useCase.execute(buildInput({ files: [file(jpegBuffer())] }));
    await expect(promise).rejects.toMatchObject({
      code: "QUOTE_IMAGE_UPLOAD_FAILED",
    });
    await expect(promise).rejects.toThrow(
      "Não foi possível enviar as imagens. Tente novamente.",
    );
    await expect(promise).rejects.not.toThrow(/42P10|database/);
  });

  it("removes the first upload and maps the error when the second upload fails", async () => {
    const boom = new Error("storage down");
    const storage = buildFakeStorage({
      uploadFile: jest
        .fn()
        .mockResolvedValueOnce("p1")
        .mockRejectedValueOnce(boom),
    });
    const { useCase, requests } = build(undefined, undefined, storage);
    await expect(
      useCase.execute(
        buildInput({ files: [file(jpegBuffer()), file(pngBuffer())] }),
      ),
    ).rejects.toMatchObject({ code: "QUOTE_IMAGE_UPLOAD_FAILED" });
    expect(storage.removeFile).toHaveBeenCalledTimes(1);
    expect(storage.removeFile.mock.calls[0]![1]).toBe(
      storage.uploadFile.mock.calls[0]![1],
    );
    expect(requests.createWithImagesAsAdmin).not.toHaveBeenCalled();
  });

  it("removes all uploads and rethrows when the insert fails", async () => {
    const boom = new Error("db down");
    const requests = buildFakeRequestRepo({
      createWithImagesAsAdmin: jest.fn().mockRejectedValue(boom),
    });
    const { useCase, storage } = build(undefined, requests);
    await expect(
      useCase.execute(
        buildInput({ files: [file(jpegBuffer()), file(pngBuffer())] }),
      ),
    ).rejects.toBe(boom);
    expect(storage.removeFile).toHaveBeenCalledTimes(2);
  });

  it("keeps cleaning up when a removal fails", async () => {
    const storage = buildFakeStorage({
      removeFile: jest.fn().mockRejectedValue(new Error("rm failed")),
    });
    const requests = buildFakeRequestRepo({
      createWithImagesAsAdmin: jest.fn().mockRejectedValue(new Error("db")),
    });
    const { useCase } = build(undefined, requests, storage);
    await expect(
      useCase.execute(
        buildInput({ files: [file(jpegBuffer()), file(pngBuffer())] }),
      ),
    ).rejects.toThrow("db");
    expect(storage.removeFile).toHaveBeenCalledTimes(2);
  });

  it("sets expiresAt to now + 30 days", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-01T12:00:00Z"));
    const { useCase, requests } = build();
    await useCase.execute(buildInput());
    const [request] = requests.createWithImagesAsAdmin.mock.calls[0]!;
    expect(request.expiresAt.toISOString()).toBe("2026-10-31T12:00:00.000Z");
    expect(request.createdAt.toISOString()).toBe("2026-10-01T12:00:00.000Z");
    expect(request.privacyConsentAcceptedAt.toISOString()).toBe(
      "2026-10-01T12:00:00.000Z",
    );
  });

  it("records no retention consent and omits its text when unchecked", async () => {
    const { useCase, requests } = build();
    await useCase.execute(buildInput({ contactRetentionConsent: false }));
    const [request] = requests.createWithImagesAsAdmin.mock.calls[0]!;
    expect(request.contactRetentionConsentAcceptedAt).toBeNull();
    expect(request.consentTextSnapshot).not.toContain("Retenção de contato");
  });

  it("records retention consent when checked", async () => {
    const { useCase, requests } = build();
    await useCase.execute(buildInput({ contactRetentionConsent: true }));
    const [request] = requests.createWithImagesAsAdmin.mock.calls[0]!;
    expect(request.contactRetentionConsentAcceptedAt).toBeInstanceOf(Date);
    expect(request.consentTextSnapshot).toContain("Retenção de contato");
  });

  it("never logs requester PII on failure", async () => {
    const errorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    const requests = buildFakeRequestRepo({
      createWithImagesAsAdmin: jest.fn().mockRejectedValue(new Error("db")),
    });
    const { useCase } = build(undefined, requests);
    await expect(useCase.execute(buildInput())).rejects.toThrow("db");
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).not.toContain("Joao");
    expect(logged).not.toContain("example.com");
    expect(logged).not.toContain("5511999998888");
    expect(logged).not.toContain("leao");
  });
});
