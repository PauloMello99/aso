import { Logger } from "@nestjs/common";
import {
  GetQuoteRequestUseCase,
  QUOTE_IMAGE_SIGNED_URL_TTL_SECONDS,
} from "./get-quote-request.use-case";
import { QUOTE_REQUEST_IMAGES_BUCKET } from "./submit-quote-request.use-case";
import { IQuoteRequestRepository } from "../../domain/quote-request.repository.interface";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { IStorageProvider } from "../../../auth/application/ports/storage-provider.interface";
import { QuoteRequestNotFoundException } from "../../domain/exceptions/quote-request-not-found.exception";

const SIGNED_SECRET = "https://storage.example/sign?token=segredo";

function buildDetail(images: unknown[]) {
  return {
    id: "r-1",
    targetUserId: "user-1",
    targetDisplayName: "Maria Tattoo",
    requesterName: "Joao",
    requesterPhone: "+5511999998888",
    requesterEmail: "joao@example.com",
    idea: "Um leao",
    status: "new",
    viewedAt: null,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    expiresAt: new Date("2026-10-31T00:00:00Z"),
    contactRetentionConsentAcceptedAt: null,
    images,
  };
}

const jpg = {
  id: "i-1",
  storagePath: "org-1/r-1/a.jpg",
  contentType: "image/jpeg",
  sizeBytes: 10,
  position: 0,
};
const heic = {
  id: "i-2",
  storagePath: "org-1/r-1/b.heic",
  contentType: "image/heic",
  sizeBytes: 10,
  position: 1,
};

function build(
  detail: unknown,
  signer: jest.Mock = jest.fn().mockResolvedValue({
    [jpg.storagePath]: { url: "u-jpg", downloadUrl: "d-jpg" },
    [heic.storagePath]: { url: "u-heic", downloadUrl: "d-heic" },
  }),
  member = { role: "employee", userId: "user-1", enabled: true },
) {
  const requests = {
    findDetailForViewer: jest.fn().mockResolvedValue(detail),
  } as unknown as jest.Mocked<IQuoteRequestRepository>;
  const members = {
    findByAuthId: jest.fn().mockResolvedValue(member),
  } as unknown as jest.Mocked<IMemberRepository>;
  const storage = {
    createSignedFileUrls: signer,
  } as unknown as jest.Mocked<IStorageProvider>;
  return {
    requests,
    storage,
    useCase: new GetQuoteRequestUseCase(requests, members, storage),
  };
}

describe("GetQuoteRequestUseCase", () => {
  afterEach(() => jest.restoreAllMocks());

  it("consulta no escopo do funcionario", async () => {
    const { useCase, requests } = build(buildDetail([]));
    await useCase.execute({ orgId: "org-1", authId: "a", id: "r-1" });
    expect(requests.findDetailForViewer).toHaveBeenCalledWith(
      "org-1",
      { kind: "own", userId: "user-1" },
      "r-1",
    );
  });

  it("owner consulta com escopo all", async () => {
    const { useCase, requests } = build(
      buildDetail([]),
      undefined,
      { role: "owner", userId: "u", enabled: true },
    );
    await useCase.execute({ orgId: "org-1", authId: "a", id: "r-1" });
    expect(requests.findDetailForViewer.mock.calls[0]![1]).toEqual({ kind: "all" });
  });

  it("detalhe nulo => 404 e NAO assina nenhuma URL", async () => {
    const { useCase, storage } = build(null);
    await expect(
      useCase.execute({ orgId: "org-1", authId: "a", id: "r-x" }),
    ).rejects.toBeInstanceOf(QuoteRequestNotFoundException);
    expect(storage.createSignedFileUrls).not.toHaveBeenCalled();
  });

  it("assina com TTL de 300s, nomes de download e sem expor storagePath/consentimento", async () => {
    const { useCase, storage } = build(buildDetail([jpg, heic]));
    const out = await useCase.execute({ orgId: "org-1", authId: "a", id: "r-1" });

    expect(QUOTE_IMAGE_SIGNED_URL_TTL_SECONDS).toBe(300);
    expect(storage.createSignedFileUrls).toHaveBeenCalledWith(
      QUOTE_REQUEST_IMAGES_BUCKET,
      [jpg.storagePath, heic.storagePath],
      {
        expiresInSeconds: 300,
        downloadFileNameByPath: {
          [jpg.storagePath]: "referencia-1.jpg",
          [heic.storagePath]: "referencia-2.heic",
        },
      },
    );
    expect(out.images).toEqual([
      { id: "i-1", position: 0, contentType: "image/jpeg", previewable: true, url: "u-jpg", downloadUrl: "d-jpg" },
      { id: "i-2", position: 1, contentType: "image/heic", previewable: false, url: "u-heic", downloadUrl: "d-heic" },
    ]);
    expect(out.imagesUnavailable).toBe(false);
    expect(out.targetDisplayName).toBe("Maria Tattoo");
    expect(out.viewed).toBe(false);
    const serialized = JSON.stringify(out);
    expect(serialized).not.toContain("org-1/r-1");
    expect(serialized).not.toContain("consent");
  });

  it("sem imagens nao chama o storage", async () => {
    const { useCase, storage } = build(buildDetail([]));
    const out = await useCase.execute({ orgId: "org-1", authId: "a", id: "r-1" });
    expect(storage.createSignedFileUrls).not.toHaveBeenCalled();
    expect(out.images).toEqual([]);
  });

  it("falha do storage => imagesUnavailable, URLs nulas e log sem URL/mensagem do provider", async () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    const signer = jest
      .fn()
      .mockRejectedValue(new Error(`provider falhou ${SIGNED_SECRET}`));
    const { useCase } = build(buildDetail([jpg]), signer);

    const out = await useCase.execute({ orgId: "org-1", authId: "a", id: "r-1" });

    expect(out.imagesUnavailable).toBe(true);
    expect(out.images[0]).toMatchObject({ url: null, downloadUrl: null });
    const logged = JSON.stringify(warnSpy.mock.calls);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(logged).not.toContain("segredo");
    expect(logged).not.toContain("provider falhou");
    expect(logged).toContain("r-1");
  });
});
