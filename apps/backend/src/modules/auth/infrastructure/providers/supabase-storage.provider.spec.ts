import { ConfigService } from "@nestjs/config";
import { SupabaseStorageProvider } from "./supabase-storage.provider";
import { AvatarUploadFailedException } from "../../domain/exceptions/avatar-upload-failed.exception";

const createSignedUrls = jest.fn();
const from = jest.fn(() => ({ createSignedUrls }));

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
