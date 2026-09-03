import type { IStorageProvider } from "../../../auth/application/ports/storage-provider.interface";
import type { IOrganizationRepository } from "../../../organizations/domain/org.repository.interface";
import { CampaignImageUnsupportedTypeException } from "../../domain/exceptions/campaign-image-unsupported-type.exception";
import { CampaignSettingsForbiddenException } from "../../domain/exceptions/campaign-settings-forbidden.exception";
import {
  UploadCampaignImageInput,
  UploadCampaignImageUseCase,
} from "./upload-campaign-image.use-case";

const PUBLIC_URL =
  "https://x.supabase.co/storage/v1/object/public/campaign-images/org-1/f.png";

function buildStorage(
  overrides: Partial<jest.Mocked<IStorageProvider>> = {},
): jest.Mocked<IStorageProvider> {
  return {
    uploadAvatar: jest.fn(),
    uploadFile: jest.fn().mockResolvedValue(PUBLIC_URL),
    createSignedUrl: jest.fn(),
    createSignedFileUrls: jest.fn(),
    getPublicUrl: jest.fn().mockReturnValue(PUBLIC_URL),
    removeFile: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IStorageProvider>;
}

function buildOrgRepo(
  overrides: Partial<jest.Mocked<IOrganizationRepository>> = {},
): jest.Mocked<IOrganizationRepository> {
  return {
    findAllByAuthId: jest.fn(),
    findByIdAndAuthId: jest.fn(),
    findBySlugAndAuthId: jest.fn(),
    isOwner: jest.fn().mockResolvedValue(true),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IOrganizationRepository>;
}

function buildInput(
  overrides: Partial<UploadCampaignImageInput> = {},
): UploadCampaignImageInput {
  return {
    orgId: "org-1",
    authId: "owner-1",
    fileName: "logo.png",
    contentType: "image/png",
    file: Buffer.from("fake-bytes"),
    ...overrides,
  };
}

describe("UploadCampaignImageUseCase", () => {
  it("owner: envia para o bucket campaign-images sob o prefixo da org e devolve a url pública", async () => {
    const storage = buildStorage();
    const useCase = new UploadCampaignImageUseCase(storage, buildOrgRepo());

    const result = await useCase.execute(buildInput());

    expect(storage.uploadFile).toHaveBeenCalledTimes(1);
    const [bucket, path, file, contentType] = storage.uploadFile.mock.calls[0]!;
    expect(bucket).toBe("campaign-images");
    expect(path).toMatch(/^org-1\/[0-9a-f-]{36}\.png$/);
    expect(file).toBeInstanceOf(Buffer);
    expect(contentType).toBe("image/png");
    expect(storage.getPublicUrl).toHaveBeenCalledWith("campaign-images", path);
    expect(result).toEqual({ url: PUBLIC_URL });
  });

  it("mapeia content-type para a extensão do objeto", async () => {
    const storage = buildStorage();
    const useCase = new UploadCampaignImageUseCase(storage, buildOrgRepo());

    await useCase.execute(buildInput({ contentType: "image/jpeg" }));
    await useCase.execute(buildInput({ contentType: "image/webp" }));
    await useCase.execute(buildInput({ contentType: "image/gif" }));

    const exts = storage.uploadFile.mock.calls.map(([, path]) =>
      (path as string).split(".").pop(),
    );
    expect(exts).toEqual(["jpg", "webp", "gif"]);
  });

  it("não-owner: lança CampaignSettingsForbiddenException e não envia nada", async () => {
    const storage = buildStorage();
    const useCase = new UploadCampaignImageUseCase(
      storage,
      buildOrgRepo({ isOwner: jest.fn().mockResolvedValue(false) }),
    );

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CampaignSettingsForbiddenException,
    );
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it("content-type fora do conjunto suportado: lança CampaignImageUnsupportedTypeException e não envia", async () => {
    const storage = buildStorage();
    const useCase = new UploadCampaignImageUseCase(storage, buildOrgRepo());

    await expect(
      useCase.execute(buildInput({ contentType: "image/svg+xml" })),
    ).rejects.toBeInstanceOf(CampaignImageUnsupportedTypeException);
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });
});
