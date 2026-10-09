import { Inject, Injectable } from "@nestjs/common";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import {
  IQuoteRequestRepository,
  QUOTE_REQUEST_REPOSITORY,
} from "../../domain/quote-request.repository.interface";
import { resolveViewerScope } from "./resolve-viewer-scope";

export const QUOTE_REQUESTS_DEFAULT_LIMIT = 20;
export const QUOTE_REQUESTS_MAX_LIMIT = 50;
const IDEA_PREVIEW_CHARS = 160;

export interface ListQuoteRequestsInput {
  orgId: string;
  authId: string;
  page?: number;
  limit?: number;
}

export interface QuoteRequestListItemView {
  id: string;
  targetUserId: string;
  targetDisplayName: string | null;
  requesterName: string;
  ideaPreview: string;
  status: string;
  viewed: boolean;
  imageCount: number;
  createdAt: string;
  expiresAt: string;
}

export interface ListQuoteRequestsOutput {
  items: QuoteRequestListItemView[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

@Injectable()
export class ListQuoteRequestsUseCase {
  constructor(
    @Inject(QUOTE_REQUEST_REPOSITORY)
    private readonly requests: IQuoteRequestRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly members: IMemberRepository,
  ) {}

  async execute(input: ListQuoteRequestsInput): Promise<ListQuoteRequestsOutput> {
    const scope = await resolveViewerScope(
      this.members,
      input.orgId,
      input.authId,
    );
    const page = clampInt(input.page, 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = clampInt(
      input.limit,
      QUOTE_REQUESTS_DEFAULT_LIMIT,
      1,
      QUOTE_REQUESTS_MAX_LIMIT,
    );

    const result = await this.requests.listForViewer(input.orgId, scope, {
      limit,
      offset: (page - 1) * limit,
      unreadOnly: false,
    });

    return {
      items: result.items.map((item) => ({
        id: item.id,
        targetUserId: item.targetUserId,
        targetDisplayName: item.targetDisplayName,
        requesterName: item.requesterName,
        ideaPreview: item.idea.slice(0, IDEA_PREVIEW_CHARS),
        status: item.status,
        viewed: item.viewedAt !== null,
        imageCount: item.imageCount,
        createdAt: item.createdAt.toISOString(),
        expiresAt: item.expiresAt.toISOString(),
      })),
      page,
      limit,
      total: result.total,
      pages: Math.max(1, Math.ceil(result.total / limit)),
    };
  }
}
