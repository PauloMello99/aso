export const STORAGE_PROVIDER = Symbol("STORAGE_PROVIDER");

export interface IStorageProvider {
  uploadAvatar(
    authId: string,
    file: Buffer,
    contentType: string,
  ): Promise<string>;

  uploadFile(
    bucket: string,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<string>;

  createSignedUrl(
    bucket: string,
    path: string,
    expiresInSeconds?: number,
    downloadFileName?: string,
  ): Promise<string>;

  createSignedFileUrls(
    bucket: string,
    paths: string[],
    opts?: {
      expiresInSeconds?: number;
      downloadFileNameByPath?: Record<string, string>;
    },
  ): Promise<Record<string, { url: string; downloadUrl: string }>>;

  removeFile(bucket: string, path: string): Promise<void>;
}
