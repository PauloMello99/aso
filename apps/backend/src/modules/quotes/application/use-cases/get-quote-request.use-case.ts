import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import {
  IStorageProvider,
  STORAGE_PROVIDER,
} from "../../../auth/application/ports/storage-provider.interface";
import {
  IQuoteRequestRepository,
  QUOTE_REQUEST_REPOSITORY,
} from "../../domain/quote-request.repository.interface";
import { QuoteRequestNotFoundException } from "../../domain/exceptions/quote-request-not-found.exception";
import { QUOTE_REQUEST_IMAGES_BUCKET } from "./submit-quote-request.use-case";
import { resolveViewerScope } from "./resolve-viewer-scope";

export const QUOTE_IMAGE_SIGNED_URL_TTL_SECONDS = 300;

const NON_PREVIEWABLE_TYPES = new Set(["image/heic", "image/heif"]);

export interface GetQuoteRequestInput {
  orgId: string;
  authId: string;
  id: string;
}

export interface QuoteRequestImageView {
  id: string;
  position: number;
  contentType: string;
  // false para HEIC/HEIF (Chrome/Android nao renderiza): a UI mostra "Baixar".
  previewable: boolean;
  url: string | null;
  downloadUrl: string | null;
}

export interface QuoteRequestDetailView {
  id: string;
  targetUserId: string;
  targetDisplayName: string | null;
  requesterName: string;
  requesterPhone: string;
  requesterEmail: string;
  idea: string;
  status: string;
  viewed: boolean;
  contactRetentionAccepted: boolean;
  createdAt: string;
  expiresAt: string;
  images: QuoteRequestImageView[];
  imagesUnavailable: boolean;
}

function extensionOf(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "bin" : path.slice(dot + 1);
}

@Injectable()
export class GetQuoteRequestUseCase {
  private readonly logger = new Logger(GetQuoteRequestUseCase.name);

  constructor(
    @Inject(QUOTE_REQUEST_REPOSITORY)
    private readonly requests: IQuoteRequestRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly members: IMemberRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
  ) {}

  // Nao marca como lido (isso e o POST :id/viewed). URLs assinadas so sao geradas
  // DEPOIS de a linha ser autorizada e nunca sao persistidas nem logadas.
  async execute(input: GetQuoteRequestInput): Promise<QuoteRequestDetailView> {
    const scope = await resolveViewerScope(
      this.members,
      input.orgId,
      input.authId,
    );
    const detail = await this.requests.findDetailForViewer(
      input.orgId,
      scope,
      input.id,
    );
    if (!detail) throw new QuoteRequestNotFoundException();

    let signed: Record<string, { url: string; downloadUrl: string }> = {};
    let imagesUnavailable = false;
    if (detail.images.length > 0) {
      const downloadFileNameByPath: Record<string, string> = {};
      for (const image of detail.images) {
        downloadFileNameByPath[image.storagePath] =
          `referencia-${image.position + 1}.${extensionOf(image.storagePath)}`;
      }
      try {
        signed = await this.storage.createSignedFileUrls(
          QUOTE_REQUEST_IMAGES_BUCKET,
          detail.images.map((image) => image.storagePath),
          {
            expiresInSeconds: QUOTE_IMAGE_SIGNED_URL_TTL_SECONDS,
            downloadFileNameByPath,
          },
        );
      } catch {
        // Sem URL nem mensagem do provider no log: so ids e contagem.
        imagesUnavailable = true;
        this.logger.warn(
          `Falha ao assinar imagens do pedido de orcamento ${detail.id} (org ${input.orgId}, imagens ${detail.images.length})`,
        );
      }
    }

    return {
      id: detail.id,
      targetUserId: detail.targetUserId,
      targetDisplayName: detail.targetDisplayName,
      requesterName: detail.requesterName,
      requesterPhone: detail.requesterPhone,
      requesterEmail: detail.requesterEmail,
      idea: detail.idea,
      status: detail.status,
      viewed: detail.viewedAt !== null,
      contactRetentionAccepted: detail.contactRetentionConsentAcceptedAt !== null,
      createdAt: detail.createdAt.toISOString(),
      expiresAt: detail.expiresAt.toISOString(),
      images: detail.images.map((image) => ({
        id: image.id,
        position: image.position,
        contentType: image.contentType,
        previewable: !NON_PREVIEWABLE_TYPES.has(image.contentType),
        url: signed[image.storagePath]?.url ?? null,
        downloadUrl: signed[image.storagePath]?.downloadUrl ?? null,
      })),
      imagesUnavailable,
    };
  }
}
