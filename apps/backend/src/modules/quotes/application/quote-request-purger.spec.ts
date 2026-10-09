import {
  QuotePurgeResidualObjectsError,
  QuotePurgeUnsafePathError,
  QuoteRequestPurger,
} from "./quote-request-purger";
import { QUOTE_REQUEST_IMAGES_BUCKET } from "./use-cases/submit-quote-request.use-case";
import {
  IQuoteRequestPurgeRepository,
  QuoteRequestPurgeClaim,
} from "../domain/quote-request-purge.repository.interface";
import {
  IStorageProvider,
  StorageObjectEntry,
} from "../../auth/application/ports/storage-provider.interface";
import { StorageOperationFailedException } from "../../auth/domain/exceptions/storage-operation-failed.exception";

const ORG_ID = "11111111-1111-1111-1111-111111111111";
const REQUEST_ID = "22222222-2222-2222-2222-222222222222";
const PREFIX = `${ORG_ID}/${REQUEST_ID}`;
const CLAIMED_AT = new Date("2026-10-08T10:00:00Z");

function buildClaim(
  overrides: Partial<QuoteRequestPurgeClaim> = {},
): QuoteRequestPurgeClaim {
  return {
    id: REQUEST_ID,
    orgId: ORG_ID,
    scope: "all",
    attempts: 1,
    claimedAt: CLAIMED_AT,
    ...overrides,
  };
}

function buildFile(name: string): StorageObjectEntry {
  return {
    name,
    path: `${PREFIX}/${name}`,
    kind: "file",
    createdAt: new Date("2026-09-01T00:00:00Z"),
  };
}

function buildFakeRepo(
  overrides: Partial<jest.Mocked<IQuoteRequestPurgeRepository>> = {},
): jest.Mocked<IQuoteRequestPurgeRepository> {
  return {
    claimDuePurges: jest.fn(),
    listImagePaths: jest.fn().mockResolvedValue([]),
    deleteRequest: jest.fn().mockResolvedValue(true),
    completeImagePurge: jest.fn().mockResolvedValue(true),
    recordPurgeFailure: jest.fn(),
    findExistingRequestIds: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IQuoteRequestPurgeRepository>;
}

function buildFakeStorage(
  overrides: Partial<jest.Mocked<IStorageProvider>> = {},
): jest.Mocked<IStorageProvider> {
  return {
    removeFiles: jest.fn().mockResolvedValue(undefined),
    listObjects: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as jest.Mocked<IStorageProvider>;
}

describe("QuoteRequestPurger", () => {
  it("remove os arquivos do storage ANTES de apagar a linha (scope all)", async () => {
    const repo = buildFakeRepo({
      listImagePaths: jest.fn().mockResolvedValue([`${PREFIX}/a.png`]),
    });
    const storage = buildFakeStorage({
      listObjects: jest
        .fn()
        .mockResolvedValueOnce([buildFile("a.png")])
        .mockResolvedValueOnce([]),
    });

    await new QuoteRequestPurger(repo, storage).purge(buildClaim());

    expect(storage.removeFiles).toHaveBeenCalledWith(
      QUOTE_REQUEST_IMAGES_BUCKET,
      [`${PREFIX}/a.png`],
    );
    expect(repo.deleteRequest).toHaveBeenCalledWith(ORG_ID, REQUEST_ID);
    // Sequencia completa: lista -> remove -> RE-lista -> apaga a linha.
    expect(storage.listObjects).toHaveBeenCalledTimes(2);
    const [firstList, secondList] = storage.listObjects.mock.invocationCallOrder;
    const removeOrder = storage.removeFiles.mock.invocationCallOrder[0]!;
    const deleteOrder = repo.deleteRequest.mock.invocationCallOrder[0]!;
    expect(firstList!).toBeLessThan(removeOrder);
    expect(removeOrder).toBeLessThan(secondList!);
    expect(secondList!).toBeLessThan(deleteOrder);
    expect(repo.completeImagePurge).not.toHaveBeenCalled();
  });

  it("residuo que e PASTA na re-listagem tambem falha fechado", async () => {
    const repo = buildFakeRepo();
    const storage = buildFakeStorage({
      listObjects: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            name: "sub",
            path: `${PREFIX}/sub`,
            kind: "folder",
            createdAt: null,
          },
        ]),
    });

    await expect(
      new QuoteRequestPurger(repo, storage).purge(buildClaim()),
    ).rejects.toBeInstanceOf(QuotePurgeResidualObjectsError);
    expect(repo.deleteRequest).not.toHaveBeenCalled();
  });

  it("sem arquivos nao chama removeFiles, mas ainda apaga a linha", async () => {
    const repo = buildFakeRepo();
    const storage = buildFakeStorage();

    await new QuoteRequestPurger(repo, storage).purge(buildClaim());

    expect(storage.removeFiles).not.toHaveBeenCalled();
    expect(repo.deleteRequest).toHaveBeenCalledTimes(1);
  });

  it("une paths do banco e do storage sem duplicar", async () => {
    const repo = buildFakeRepo({
      listImagePaths: jest
        .fn()
        .mockResolvedValue([`${PREFIX}/a.png`, `${PREFIX}/b.png`]),
    });
    const storage = buildFakeStorage({
      listObjects: jest
        .fn()
        .mockResolvedValueOnce([buildFile("b.png"), buildFile("c.png")])
        .mockResolvedValueOnce([]),
    });

    await new QuoteRequestPurger(repo, storage).purge(buildClaim());

    expect(storage.removeFiles).toHaveBeenCalledWith(
      QUOTE_REQUEST_IMAGES_BUCKET,
      [`${PREFIX}/a.png`, `${PREFIX}/b.png`, `${PREFIX}/c.png`],
    );
  });

  it("ignora pastas na listagem", async () => {
    const repo = buildFakeRepo();
    const storage = buildFakeStorage({
      listObjects: jest
        .fn()
        .mockResolvedValueOnce([
          {
            name: "sub",
            path: `${PREFIX}/sub`,
            kind: "folder",
            createdAt: null,
          },
        ])
        .mockResolvedValueOnce([]),
    });

    await new QuoteRequestPurger(repo, storage).purge(buildClaim());

    expect(storage.removeFiles).not.toHaveBeenCalled();
    expect(repo.deleteRequest).toHaveBeenCalledTimes(1);
  });

  it("falha do storage propaga e NAO apaga a linha", async () => {
    const repo = buildFakeRepo({
      listImagePaths: jest.fn().mockResolvedValue([`${PREFIX}/a.png`]),
    });
    const storage = buildFakeStorage({
      removeFiles: jest
        .fn()
        .mockRejectedValue(new StorageOperationFailedException("remove")),
    });

    await expect(
      new QuoteRequestPurger(repo, storage).purge(buildClaim()),
    ).rejects.toBeInstanceOf(StorageOperationFailedException);

    expect(repo.deleteRequest).not.toHaveBeenCalled();
    expect(repo.completeImagePurge).not.toHaveBeenCalled();
  });

  it("falha ao listar propaga e nao toca em nada", async () => {
    const repo = buildFakeRepo();
    const storage = buildFakeStorage({
      listObjects: jest
        .fn()
        .mockRejectedValue(new StorageOperationFailedException("list")),
    });

    await expect(
      new QuoteRequestPurger(repo, storage).purge(buildClaim()),
    ).rejects.toBeInstanceOf(StorageOperationFailedException);

    expect(storage.removeFiles).not.toHaveBeenCalled();
    expect(repo.deleteRequest).not.toHaveBeenCalled();
  });

  it("residuo apos a remocao lanca QuotePurgeResidualObjectsError e nao apaga a linha", async () => {
    const repo = buildFakeRepo();
    const storage = buildFakeStorage({
      listObjects: jest.fn().mockResolvedValue([buildFile("a.png")]),
    });

    const error = await new QuoteRequestPurger(repo, storage)
      .purge(buildClaim())
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(QuotePurgeResidualObjectsError);
    expect((error as Error).message).not.toContain(REQUEST_ID);
    expect(repo.deleteRequest).not.toHaveBeenCalled();
  });

  it("path fora do prefixo do pedido lanca QuotePurgeUnsafePathError e nunca remove", async () => {
    const repo = buildFakeRepo({
      listImagePaths: jest
        .fn()
        .mockResolvedValue([`${ORG_ID}/outro-pedido/a.png`]),
    });
    const storage = buildFakeStorage();

    const error = await new QuoteRequestPurger(repo, storage)
      .purge(buildClaim())
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(QuotePurgeUnsafePathError);
    expect(storage.removeFiles).not.toHaveBeenCalled();
    expect(repo.deleteRequest).not.toHaveBeenCalled();
  });

  it("prefixo parecido (sem a barra final) tambem e rejeitado", async () => {
    const repo = buildFakeRepo({
      listImagePaths: jest.fn().mockResolvedValue([`${PREFIX}x/a.png`]),
    });
    const storage = buildFakeStorage();

    await expect(
      new QuoteRequestPurger(repo, storage).purge(buildClaim()),
    ).rejects.toBeInstanceOf(QuotePurgeUnsafePathError);
  });

  it("scope images: conclui a purga de imagens com o claimedAt e nao apaga a linha", async () => {
    const repo = buildFakeRepo({
      listImagePaths: jest.fn().mockResolvedValue([`${PREFIX}/a.png`]),
    });
    const storage = buildFakeStorage();

    await new QuoteRequestPurger(repo, storage).purge(
      buildClaim({ scope: "images" }),
    );

    expect(storage.removeFiles).toHaveBeenCalledTimes(1);
    expect(repo.completeImagePurge).toHaveBeenCalledWith(
      ORG_ID,
      REQUEST_ID,
      CLAIMED_AT,
    );
    expect(storage.listObjects).toHaveBeenCalledTimes(2);
    expect(storage.removeFiles.mock.invocationCallOrder[0]!).toBeLessThan(
      storage.listObjects.mock.invocationCallOrder[1]!,
    );
    expect(storage.listObjects.mock.invocationCallOrder[1]!).toBeLessThan(
      repo.completeImagePurge.mock.invocationCallOrder[0]!,
    );
    expect(repo.deleteRequest).not.toHaveBeenCalled();
  });

  it("devolve false quando o repo nao concluiu (claim perdido / linha ja apagada)", async () => {
    const repo = buildFakeRepo({
      deleteRequest: jest.fn().mockResolvedValue(false),
      completeImagePurge: jest.fn().mockResolvedValue(false),
    });
    const purger = new QuoteRequestPurger(repo, buildFakeStorage());

    await expect(purger.purge(buildClaim())).resolves.toBe(false);
    await expect(purger.purge(buildClaim({ scope: "images" }))).resolves.toBe(
      false,
    );
  });

  it("lista o prefixo orgId/requestId", async () => {
    const repo = buildFakeRepo();
    const storage = buildFakeStorage();

    await new QuoteRequestPurger(repo, storage).purge(buildClaim());

    expect(storage.listObjects).toHaveBeenCalledWith(
      QUOTE_REQUEST_IMAGES_BUCKET,
      PREFIX,
    );
  });
});
