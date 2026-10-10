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

export interface CountUnreadQuoteRequestsInput {
  orgId: string;
  authId: string;
}

@Injectable()
export class CountUnreadQuoteRequestsUseCase {
  constructor(
    @Inject(QUOTE_REQUEST_REPOSITORY)
    private readonly requests: IQuoteRequestRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly members: IMemberRepository,
  ) {}

  async execute(
    input: CountUnreadQuoteRequestsInput,
  ): Promise<{ unread: number }> {
    const scope = await resolveViewerScope(
      this.members,
      input.orgId,
      input.authId,
    );
    const unread = await this.requests.countUnreadForViewer(input.orgId, scope);
    return { unread };
  }
}
