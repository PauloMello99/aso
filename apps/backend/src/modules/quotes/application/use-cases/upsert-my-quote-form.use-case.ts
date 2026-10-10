import { Inject, Injectable } from "@nestjs/common";
import {
  IQuoteFormRepository,
  QUOTE_FORM_REPOSITORY,
  QuoteFormRecord,
} from "../../domain/quote-form.repository.interface";
import {
  hasValidQuoteFormSlugFormat,
  isReservedQuoteFormSlug,
  normalizeQuoteFormSlug,
} from "../../domain/quote-form-slug";
import { QuoteRequestInvalidException } from "../../domain/exceptions/quote-request-invalid.exception";
import { QuoteFormSlugUnavailableException } from "../../domain/exceptions/quote-form-slug-unavailable.exception";
import { QuoteFormMembershipRequiredException } from "../../domain/exceptions/quote-form-membership-required.exception";

export interface UpsertMyQuoteFormInput {
  orgId: string;
  authId: string;
  slug: string;
  displayName: string;
  enabled: boolean;
}

@Injectable()
export class UpsertMyQuoteFormUseCase {
  constructor(
    @Inject(QUOTE_FORM_REPOSITORY)
    private readonly forms: IQuoteFormRepository,
  ) {}

  async execute(input: UpsertMyQuoteFormInput): Promise<QuoteFormRecord> {
    const slug = normalizeQuoteFormSlug(input.slug);
    if (!hasValidQuoteFormSlugFormat(slug)) {
      throw new QuoteRequestInvalidException("slug_invalid");
    }
    if (isReservedQuoteFormSlug(slug)) {
      throw new QuoteFormSlugUnavailableException();
    }

    const member = await this.forms.findMemberContext(
      input.orgId,
      input.authId,
    );
    if (!member) throw new QuoteFormMembershipRequiredException();

    // Desativar mantem o slug reservado ao profissional; trocar libera o anterior.
    return this.forms.upsertForMember({
      orgId: input.orgId,
      userId: member.userId,
      slug,
      displayName: input.displayName.trim(),
      enabled: input.enabled,
    });
  }
}
