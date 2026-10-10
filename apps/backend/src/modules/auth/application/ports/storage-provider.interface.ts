export const STORAGE_PROVIDER = Symbol("STORAGE_PROVIDER");

export interface StorageObjectEntry {
  /** Ultimo segmento do path (nome do arquivo ou da pasta). */
  name: string;
  /** Path completo dentro do bucket (prefix + name). */
  path: string;
  kind: "file" | "folder";
  /** null quando o provider nao informa (sempre null para pastas). */
  createdAt: Date | null;
}

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

  getPublicUrl(bucket: string, path: string): string;

  removeFile(bucket: string, path: string): Promise<void>;

  /**
   * Remove varios objetos (dedup, lotes internos). Objeto inexistente NAO e erro.
   * Lanca StorageOperationFailedException('remove') se o provider devolver erro ou rejeitar.
   */
  removeFiles(bucket: string, paths: string[]): Promise<void>;

  /**
   * Lista UM nivel sob `prefix` ('' = raiz do bucket), paginando internamente.
   * Lanca StorageOperationFailedException('list') em erro.
   */
  listObjects(
    bucket: string,
    prefix: string,
    opts?: { maxEntries?: number },
  ): Promise<StorageObjectEntry[]>;
}
