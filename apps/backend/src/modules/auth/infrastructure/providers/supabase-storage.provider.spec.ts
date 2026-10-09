import { ConfigService } from "@nestjs/config";
import { SupabaseStorageProvider } from "./supabase-storage.provider";
import { AvatarUploadFailedException } from "../../domain/exceptions/avatar-upload-failed.exception";
import { StorageOperationFailedException } from "../../domain/exceptions/storage-operation-failed.exception";

const createSignedUrls = jest.fn();
const remove = jest.fn();
const list = jest.fn();
const from = jest.fn(() => ({ createSignedUrls, remove, list }));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    storage: { from },
  })),
}));

function buildConfig(): ConfigService {
  return {
    getOrThrow: jest.fn().mockReturnValue("fake-value"),
  } as unknown as ConfigService;
}

describe("SupabaseStorageProvider.createSignedFileUrls", () => {
  beforeEach(() => {
    createSignedUrls.mockReset();
    from.mockClear();
  });

  it("retorna objeto vazio sem chamar o supabase quando não há paths", async () => {
    const provider = new SupabaseStorageProvider(buildConfig());

    const result = await provider.createSignedFileUrls("bucket", []);

    expect(result).toEqual({});
    expect(createSignedUrls).not.toHaveBeenCalled();
  });

  it("mapeia o resultado por path, não por índice (ordem de retorno não é garantida)", async () => {
    createSignedUrls.mockResolvedValue({
      data: [
        {
          path: "b.png",
          signedUrl: "https://signed.example/b?token=1",
          error: null,
        },
        {
          path: "a.pdf",
          signedUrl: "https://signed.example/a?token=2",
          error: null,
        },
      ],
      error: null,
    });
    const provider = new SupabaseStorageProvider(buildConfig());

    const result = await provider.createSignedFileUrls(
      "bucket",
      ["a.pdf", "b.png"],
      { downloadFileNameByPath: { "a.pdf": "a.pdf", "b.png": "b.png" } },
    );

    expect(result["a.pdf"]?.url).toBe("https://signed.example/a?token=2");
    expect(result["a.pdf"]?.downloadUrl).toBe(
      "https://signed.example/a?token=2&download=a.pdf",
    );
    expect(result["b.png"]?.url).toBe("https://signed.example/b?token=1");
    expect(result["b.png"]?.downloadUrl).toBe(
      "https://signed.example/b?token=1&download=b.png",
    );
  });

  it("omite entradas com erro ou signedUrl nulo, sem derrubar as demais", async () => {
    createSignedUrls.mockResolvedValue({
      data: [
        {
          path: "a.pdf",
          signedUrl: "https://signed.example/a?token=1",
          error: null,
        },
        { path: "b.png", signedUrl: null, error: "not found" },
      ],
      error: null,
    });
    const provider = new SupabaseStorageProvider(buildConfig());

    const result = await provider.createSignedFileUrls("bucket", [
      "a.pdf",
      "b.png",
    ]);

    expect(Object.keys(result)).toEqual(["a.pdf"]);
  });

  it("usa a mesma URL para url e downloadUrl quando não há nome de download para o path", async () => {
    createSignedUrls.mockResolvedValue({
      data: [
        {
          path: "a.pdf",
          signedUrl: "https://signed.example/a?token=1",
          error: null,
        },
      ],
      error: null,
    });
    const provider = new SupabaseStorageProvider(buildConfig());

    const result = await provider.createSignedFileUrls("bucket", ["a.pdf"]);

    expect(result["a.pdf"]?.url).toBe(result["a.pdf"]?.downloadUrl);
  });

  it("normaliza path bucket-qualificado (defensivo, caso a API mude o formato do echo)", async () => {
    createSignedUrls.mockResolvedValue({
      data: [
        {
          path: "bucket/a.pdf",
          signedUrl: "https://signed.example/a?token=1",
          error: null,
        },
      ],
      error: null,
    });
    const provider = new SupabaseStorageProvider(buildConfig());

    const result = await provider.createSignedFileUrls("bucket", ["a.pdf"]);

    expect(result["a.pdf"]?.url).toBe("https://signed.example/a?token=1");
  });

  it("lança AvatarUploadFailedException quando a chamada em lote falha", async () => {
    createSignedUrls.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });
    const provider = new SupabaseStorageProvider(buildConfig());

    await expect(
      provider.createSignedFileUrls("bucket", ["a.pdf"]),
    ).rejects.toBeInstanceOf(AvatarUploadFailedException);
  });
});

describe("SupabaseStorageProvider.removeFile (caracterizacao)", () => {
  beforeEach(() => {
    remove.mockReset();
  });

  it("continua ignorando { error } do provider (comportamento legado inalterado)", async () => {
    remove.mockResolvedValue({ data: null, error: { message: "boom" } });
    const provider = new SupabaseStorageProvider(buildConfig());

    await expect(provider.removeFile("b", "a/x.png")).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith(["a/x.png"]);
  });
});

describe("SupabaseStorageProvider.removeFiles", () => {
  beforeEach(() => {
    remove.mockReset();
    remove.mockResolvedValue({ data: [], error: null });
  });

  it("nao chama o provider quando nao ha paths", async () => {
    const provider = new SupabaseStorageProvider(buildConfig());

    await provider.removeFiles("b", []);

    expect(remove).not.toHaveBeenCalled();
  });

  it("divide 250 paths em 3 chamadas (100/100/50)", async () => {
    const provider = new SupabaseStorageProvider(buildConfig());
    const paths = Array.from({ length: 250 }, (_, i) => `o/r/${i}.png`);

    await provider.removeFiles("b", paths);

    expect(remove).toHaveBeenCalledTimes(3);
    expect(remove.mock.calls.map((c: string[][]) => c[0]!.length)).toEqual([
      100, 100, 50,
    ]);
  });

  it("deduplica paths repetidos", async () => {
    const provider = new SupabaseStorageProvider(buildConfig());

    await provider.removeFiles("b", ["a", "a", "b"]);

    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(["a", "b"]);
  });

  it("objeto inexistente (data vazio, sem error) nao e erro", async () => {
    remove.mockResolvedValue({ data: [], error: null });
    const provider = new SupabaseStorageProvider(buildConfig());

    await expect(provider.removeFiles("b", ["gone"])).resolves.toBeUndefined();
  });

  it("lanca StorageOperationFailedException com mensagem fixa, sem vazar texto do provider", async () => {
    remove.mockResolvedValue({
      data: null,
      error: { message: "secret org/req/path.png failed" },
    });
    const provider = new SupabaseStorageProvider(buildConfig());

    const error = await provider
      .removeFiles("b", ["o/r/a.png"])
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(StorageOperationFailedException);
    const failure = error as StorageOperationFailedException;
    expect(failure.code).toBe("STORAGE_OPERATION_FAILED");
    expect(failure.message).toBe("Storage remove failed");
    expect(failure.message).not.toContain("secret");
  });

  it("converte rejeicao do provider na mesma excecao fixa", async () => {
    remove.mockRejectedValue(new Error("network o/r/a.png"));
    const provider = new SupabaseStorageProvider(buildConfig());

    const error = await provider
      .removeFiles("b", ["o/r/a.png"])
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(StorageOperationFailedException);
    expect((error as Error).message).toBe("Storage remove failed");
  });
});

describe("SupabaseStorageProvider.listObjects", () => {
  beforeEach(() => {
    list.mockReset();
  });

  function buildFileObject(name: string, createdAt: string | null = "2026-10-01T00:00:00Z") {
    return { id: `id-${name}`, name, created_at: createdAt };
  }

  it("lista um nivel, mapeia arquivo/pasta e monta o path com o prefixo", async () => {
    list.mockResolvedValue({
      data: [
        buildFileObject("a.png"),
        { id: null, name: "sub", created_at: null },
      ],
      error: null,
    });
    const provider = new SupabaseStorageProvider(buildConfig());

    const entries = await provider.listObjects("b", "org/req");

    expect(list).toHaveBeenCalledWith("org/req", {
      limit: 100,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
    expect(entries).toEqual([
      {
        name: "a.png",
        path: "org/req/a.png",
        kind: "file",
        createdAt: new Date("2026-10-01T00:00:00Z"),
      },
      { name: "sub", path: "org/req/sub", kind: "folder", createdAt: null },
    ]);
  });

  it("prefixo vazio lista a raiz e o path e so o nome; barras nas pontas sao ignoradas", async () => {
    list.mockResolvedValue({ data: [buildFileObject("x")], error: null });
    const provider = new SupabaseStorageProvider(buildConfig());

    const root = await provider.listObjects("b", "");
    expect(list).toHaveBeenLastCalledWith("", expect.anything());
    expect(root[0]?.path).toBe("x");

    const slashed = await provider.listObjects("b", "/org/");
    expect(list).toHaveBeenLastCalledWith("org", expect.anything());
    expect(slashed[0]?.path).toBe("org/x");
  });

  it("createdAt nulo quando o provider nao informa created_at", async () => {
    list.mockResolvedValue({ data: [buildFileObject("a", null)], error: null });
    const provider = new SupabaseStorageProvider(buildConfig());

    const [entry] = await provider.listObjects("b", "p");

    expect(entry?.createdAt).toBeNull();
  });

  it("pagina internamente ate uma pagina incompleta", async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => buildFileObject(`f${i}`));
    list
      .mockResolvedValueOnce({ data: fullPage, error: null })
      .mockResolvedValueOnce({ data: [buildFileObject("last")], error: null });
    const provider = new SupabaseStorageProvider(buildConfig());

    const entries = await provider.listObjects("b", "p");

    expect(entries).toHaveLength(101);
    expect(list).toHaveBeenCalledTimes(2);
    expect(list.mock.calls[1]![1]).toMatchObject({ offset: 100 });
  });

  it("respeita maxEntries e para de paginar", async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => buildFileObject(`f${i}`));
    list.mockResolvedValue({ data: fullPage, error: null });
    const provider = new SupabaseStorageProvider(buildConfig());

    const entries = await provider.listObjects("b", "p", { maxEntries: 150 });

    expect(entries).toHaveLength(150);
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("lanca StorageOperationFailedException('list') em { error } e em rejeicao", async () => {
    const provider = new SupabaseStorageProvider(buildConfig());

    list.mockResolvedValueOnce({ data: null, error: { message: "secret" } });
    const viaError = await provider.listObjects("b", "p").catch((e: unknown) => e);
    expect(viaError).toBeInstanceOf(StorageOperationFailedException);
    expect((viaError as Error).message).toBe("Storage list failed");

    list.mockRejectedValueOnce(new Error("secret network"));
    const viaReject = await provider.listObjects("b", "p").catch((e: unknown) => e);
    expect(viaReject).toBeInstanceOf(StorageOperationFailedException);
    expect((viaReject as Error).message).not.toContain("secret");
  });
});
