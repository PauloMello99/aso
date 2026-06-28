export const STORAGE_PROVIDER = Symbol("STORAGE_PROVIDER");

export interface IStorageProvider {
  /**
   * Faz upload da foto de perfil e retorna a URL pública (com cache-bust).
   * Sobrescreve a foto anterior do mesmo usuário (upsert por caminho fixo).
   */
  uploadAvatar(
    authId: string,
    file: Buffer,
    contentType: string,
  ): Promise<string>;

  /** Upload genérico para um bucket/caminho. Retorna o caminho salvo. */
  uploadFile(
    bucket: string,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<string>;

  /** URL assinada temporária para ler um arquivo de bucket privado. */
  createSignedUrl(
    bucket: string,
    path: string,
    expiresInSeconds?: number,
  ): Promise<string>;

  /** Remove um arquivo de um bucket. */
  removeFile(bucket: string, path: string): Promise<void>;
}
