import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  IStorageProvider,
  STORAGE_PROVIDER,
} from "../../../auth/application/ports/storage-provider.interface";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../../organizations/domain/org.repository.interface";
import { CAMPAIGN_IMAGES_BUCKET } from "../../domain/campaign-image";
import { CampaignImageUnsupportedTypeException } from "../../domain/exceptions/campaign-image-unsupported-type.exception";
import { CampaignSettingsForbiddenException } from "../../domain/exceptions/campaign-settings-forbidden.exception";

/** `content-type` → extensão do objeto gravado no bucket. */
const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export interface UploadCampaignImageInput {
  orgId: string;
  authId: string;
  fileName: string;
  contentType: string;
  file: Buffer;
}

/**
 * Upload de uma imagem para o corpo rich-text de campanhas (T6 rework, Fatia
 * 17a). Só o dono da org (double-check via `orgRepo.isOwner`, mesmo molde de
 * create/update; `super_admin` age como dono, ADR-0013).
 *
 * NÃO grava nada no banco: a URL pública retornada vive dentro do `body` jsonb
 * da campanha, e o walker de allowlist (`validateCampaignBody`) revalida que o
 * `src` começa com o prefixo deste bucket no create/update.
 *
 * `content-type` fora do mapa → `CampaignImageUnsupportedTypeException` (→ 415).
 * O `ParseFilePipe` do controller já barra o mime antes; isto é defesa interna
 * e o use-case não lança exceção HTTP direta.
 */
@Injectable()
export class UploadCampaignImageUseCase {
  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
  ) {}

  async execute(input: UploadCampaignImageInput): Promise<{ url: string }> {
    const isOwner = await this.orgRepo.isOwner(input.orgId, input.authId);
    if (!isOwner) {
      throw new CampaignSettingsForbiddenException();
    }

    const ext = EXTENSION_BY_CONTENT_TYPE[input.contentType];
    if (!ext) {
      throw new CampaignImageUnsupportedTypeException(input.contentType);
    }

    const path = `${input.orgId}/${randomUUID()}.${ext}`;
    await this.storage.uploadFile(
      CAMPAIGN_IMAGES_BUCKET,
      path,
      input.file,
      input.contentType,
    );

    return { url: this.storage.getPublicUrl(CAMPAIGN_IMAGES_BUCKET, path) };
  }
}
