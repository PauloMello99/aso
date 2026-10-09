import { Inject, Injectable } from "@nestjs/common";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import {
  IQuoteRequestRepository,
  QUOTE_REQUEST_REPOSITORY,
} from "../../domain/quote-request.repository.interface";
import { QuoteRequestNotFoundException } from "../../domain/exceptions/quote-request-not-found.exception";
import { resolveViewerScope } from "./resolve-viewer-scope";

export interface MarkQuoteRequestViewedInput {
  orgId: string;
  authId: string;
  id: string;
}

@Injectable()
export class MarkQuoteRequestViewedUseCase {
  constructor(
    @Inject(QUOTE_REQUEST_REPOSITORY)
    private readonly requests: IQuoteRequestRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly members: IMemberRepository,
  ) {}

  // Idempotente: o repositorio so seta viewed_at quando ainda nulo.
  async execute(input: MarkQuoteRequestViewedInput): Promise<void> {
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

    await this.requests.markViewed(input.orgId, scope, input.id, new Date());
  }
}
