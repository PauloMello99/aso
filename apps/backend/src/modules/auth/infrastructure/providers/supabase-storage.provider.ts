import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  IStorageProvider,
  StorageObjectEntry,
} from "../../application/ports/storage-provider.interface";
import { AvatarUploadFailedException } from "../../domain/exceptions/avatar-upload-failed.exception";
import { StorageOperationFailedException } from "../../domain/exceptions/storage-operation-failed.exception";

const REMOVE_BATCH_SIZE = 100;
const LIST_PAGE_SIZE = 100;

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

    const path = `${authId}/avatar.${ext}`;
    const { error } = await this.admin.storage
      .from(this.bucket)
      .upload(path, file, { contentType, upsert: true });
    if (error) throw new AvatarUploadFailedException(error.message);

    const { data } = this.admin.storage.from(this.bucket).getPublicUrl(path);
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
      .upload(path, file, { contentType });
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

  async createSignedFileUrls(
    bucket: string,
    paths: string[],
    opts?: {
      expiresInSeconds?: number;
      downloadFileNameByPath?: Record<string, string>;
    },
  ): Promise<Record<string, { url: string; downloadUrl: string }>> {
    if (paths.length === 0) return {};

    const { data, error } = await this.admin.storage
      .from(bucket)
      .createSignedUrls(paths, opts?.expiresInSeconds ?? 3600);
    if (error || !data) {
      throw new AvatarUploadFailedException(
        error?.message ?? "Failed to sign URLs",
      );
    }

    const requestedPaths = new Set(paths);
    const bucketPrefix = `${bucket}/`;

    const result: Record<string, { url: string; downloadUrl: string }> = {};
    for (const entry of data) {
      if (entry.error || !entry.signedUrl || !entry.path) continue;

      // The Storage API is expected to echo back the exact path we sent, but
      // fall back to stripping a leading `${bucket}/` in case a future
      // version of the API starts returning bucket-qualified paths — without
      // this, a mismatch would silently drop the item from the result.
      const key = requestedPaths.has(entry.path)
        ? entry.path
        : entry.path.startsWith(bucketPrefix)
          ? entry.path.slice(bucketPrefix.length)
          : entry.path;

      const downloadFileName = opts?.downloadFileNameByPath?.[key];
      const downloadUrl = downloadFileName
        ? `${entry.signedUrl}${entry.signedUrl.includes("?") ? "&" : "?"}download=${encodeURIComponent(downloadFileName)}`
        : entry.signedUrl;

      result[key] = { url: entry.signedUrl, downloadUrl };
    }
    return result;
  }

  getPublicUrl(bucket: string, path: string): string {
    return this.admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async removeFile(bucket: string, path: string): Promise<void> {
    await this.admin.storage.from(bucket).remove([path]);
  }

  async removeFiles(bucket: string, paths: string[]): Promise<void> {
    const unique = [...new Set(paths)];
    if (unique.length === 0) return;

    for (let i = 0; i < unique.length; i += REMOVE_BATCH_SIZE) {
      const batch = unique.slice(i, i + REMOVE_BATCH_SIZE);
      try {
        const { error } = await this.admin.storage.from(bucket).remove(batch);
        if (error) throw new StorageOperationFailedException("remove");
      } catch (error) {
        // Mensagem fixa: o texto do provider pode conter paths/PII.
        if (error instanceof StorageOperationFailedException) throw error;
        throw new StorageOperationFailedException("remove");
      }
    }
  }

  async listObjects(
    bucket: string,
    prefix: string,
    opts?: { maxEntries?: number },
  ): Promise<StorageObjectEntry[]> {
    const maxEntries = opts?.maxEntries ?? Number.POSITIVE_INFINITY;
    const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, "");
    const entries: StorageObjectEntry[] = [];

    try {
      let offset = 0;
      while (entries.length < maxEntries) {
        const { data, error } = await this.admin.storage
          .from(bucket)
          .list(normalizedPrefix, {
            limit: LIST_PAGE_SIZE,
            offset,
            sortBy: { column: "name", order: "asc" },
          });
        if (error || !data) throw new StorageOperationFailedException("list");

        for (const item of data) {
          if (entries.length >= maxEntries) break;
          entries.push({
            name: item.name,
            path: normalizedPrefix
              ? `${normalizedPrefix}/${item.name}`
              : item.name,
            kind: item.id === null ? "folder" : "file",
            createdAt: item.created_at ? new Date(item.created_at) : null,
          });
        }

        if (data.length < LIST_PAGE_SIZE) break;
        offset += LIST_PAGE_SIZE;
      }
    } catch (error) {
      if (error instanceof StorageOperationFailedException) throw error;
      throw new StorageOperationFailedException("list");
    }
    return entries;
  }
}
