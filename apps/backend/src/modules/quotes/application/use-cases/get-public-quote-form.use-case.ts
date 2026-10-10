import { Inject, Injectable } from "@nestjs/common";
import {
  IQuoteFormRepository,
  QUOTE_FORM_REPOSITORY,
} from "../../domain/quote-form.repository.interface";
import {
  hasValidQuoteFormSlugFormat,
  normalizeQuoteFormSlug,
} from "../../domain/quote-form-slug";
import {
  QUOTE_CONSENT_VERSION,
  buildQuoteConsentTexts,
} from "../../domain/build-quote-consent-text";
import { QuoteFormNotFoundException } from "../../domain/exceptions/quote-form-not-found.exception";

export interface PublicQuoteFormView {
  studioName: string;
  professionalName: string;
  consent: {
    version: string;
    privacyText: string;
    contactRetentionText: string;
  };
}

@Injectable()
export class GetPublicQuoteFormUseCase {
  constructor(
    @Inject(QUOTE_FORM_REPOSITORY)
    private readonly forms: IQuoteFormRepository,
  ) {}

  async execute(slugRaw: string): Promise<PublicQuoteFormView> {
    const slug = normalizeQuoteFormSlug(slugRaw);
    // Mesma resposta de "inexistente", sem tocar o banco.
    if (!hasValidQuoteFormSlugFormat(slug)) {
      throw new QuoteFormNotFoundException();
    }

    const target = await this.forms.findPublicBySlugAsAdmin(slug);
    if (!target) throw new QuoteFormNotFoundException();

    const texts = buildQuoteConsentTexts({ orgName: target.orgName });
    // Nenhum id, slug, userId ou orgId e exposto.
    return {
      studioName: target.orgName,
      professionalName: target.displayName,
      consent: {
        version: QUOTE_CONSENT_VERSION,
        privacyText: texts.privacy,
        contactRetentionText: texts.contactRetention,
      },
    };
  }
}
