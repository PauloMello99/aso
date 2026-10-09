import { Inject, Injectable } from "@nestjs/common";
import { AuditService } from "../../../audit/audit.service";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import {
  IQuoteRequestRepository,
  QUOTE_REQUEST_REPOSITORY,
} from "../../domain/quote-request.repository.interface";
import { QuoteRequestNotFoundException } from "../../domain/exceptions/quote-request-not-found.exception";
import { QuoteRequestCloser } from "../quote-request-closer";
import { resolveViewer } from "./resolve-viewer-scope";

export interface DeclineQuoteRequestInput {
  orgId: string;
  authId: string;
  id: string;
}

export interface DeclineQuoteRequestOutput {
  contactRetained: boolean;
}

// "Nao agendou": encerramento irreversivel (imagens apagadas na hora; contato
// retido so com consentimento). Nao exige assinatura ativa: so reduz dados pessoais.
@Injectable()
export class DeclineQuoteRequestUseCase {
  constructor(
    @Inject(QUOTE_REQUEST_REPOSITORY)
    private readonly requests: IQuoteRequestRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly members: IMemberRepository,
    private readonly closer: QuoteRequestCloser,
    private readonly audit: AuditService,
  ) {}

  async execute(
    input: DeclineQuoteRequestInput,
  ): Promise<DeclineQuoteRequestOutput> {
    const { member, scope } = await resolveViewer(
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

    const result = await this.closer.close({
      orgId: input.orgId,
      id: input.id,
      targetUserId: detail.targetUserId,
      outcome: "not_scheduled",
      now: new Date(),
    });
    // Concorrente ou expirado entre a leitura e o encerramento.
    if (!result) throw new QuoteRequestNotFoundException();

    // Metadata sem PII: so contagens e flags.
    await this.audit.log({
      actorId: member.userId,
      orgId: input.orgId,
      action: "quote_request_closed",
      entityType: "quote_request",
      entityId: input.id,
      metadata: {
        outcome: "not_scheduled",
        imageCount: detail.images.length,
        contactRetained: result.contactRetained,
      },
    });

    return { contactRetained: result.contactRetained };
  }
}
