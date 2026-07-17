import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { IStorageProvider } from "../../application/ports/storage-provider.interface";
import { AvatarUploadFailedException } from "../../domain/exceptions/avatar-upload-failed.exception";

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

@Injectable()
export class SupabaseStorageProvider implements IStorageProvider {
  private readonly admin: SupabaseClient;
  private readonly bucket = "avatars";

  constructor(private readonly config: ConfigService) {
    this.admin = createClient(
      config.getOrThrow<string>("SUPABASE_URL"),
      config.getOrThrow<string>("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }

  async uploadAvatar(
    authId: string,
    file: Buffer,
    contentType: string,
  ): Promise<string> {
    const ext = EXT_BY_MIME[contentType];
    if (!ext) {
      throw new AvatarUploadFailedException(
        `Unsupported image type: ${contentType}`,
      );
    }

    // Caminho fixo por usuário → upsert sobrescreve a foto anterior.
    const path = `${authId}/avatar.${ext}`;
    const { error } = await this.admin.storage
      .from(this.bucket)
      .upload(path, file, { contentType, upsert: true });
    if (error) throw new AvatarUploadFailedException(error.message);

    const { data } = this.admin.storage.from(this.bucket).getPublicUrl(path);
    // Cache-bust: a URL é estável (mesmo caminho), então versionamos por tempo.
    return `${data.publicUrl}?t=${Date.now()}`;
  }

  async uploadFile(
    bucket: string,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<string> {
    const { error } = await this.admin.storage
      .from(bucket)
      .upload(path, file, { contentType, upsert: false });
    if (error) throw new AvatarUploadFailedException(error.message);
    return path;
  }

  async createSignedUrl(
    bucket: string,
    path: string,
    expiresInSeconds = 3600,
    downloadFileName?: string,
  ): Promise<string> {
    const { data, error } = downloadFileName
      ? await this.admin.storage
          .from(bucket)
          .createSignedUrl(path, expiresInSeconds, {
            download: downloadFileName,
          })
      : await this.admin.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error || !data) {
      throw new AvatarUploadFailedException(
        error?.message ?? "Failed to sign URL",
      );
    }
    return data.signedUrl;
  }

  async removeFile(bucket: string, path: string): Promise<void> {
    await this.admin.storage.from(bucket).remove([path]);
  }
}
