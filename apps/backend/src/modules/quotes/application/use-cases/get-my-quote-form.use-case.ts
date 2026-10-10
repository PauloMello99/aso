import { Inject, Injectable } from "@nestjs/common";
import {
  IQuoteFormRepository,
  QUOTE_FORM_REPOSITORY,
  QuoteFormRecord,
} from "../../domain/quote-form.repository.interface";

export interface GetMyQuoteFormInput {
  orgId: string;
  authId: string;
}

export interface GetMyQuoteFormOutput {
  form: QuoteFormRecord | null;
  canConfigure: boolean;
}

@Injectable()
export class GetMyQuoteFormUseCase {
  constructor(
    @Inject(QUOTE_FORM_REPOSITORY)
    private readonly forms: IQuoteFormRepository,
  ) {}

  async execute(input: GetMyQuoteFormInput): Promise<GetMyQuoteFormOutput> {
    const member = await this.forms.findMemberContext(
      input.orgId,
      input.authId,
    );
    // super_admin agindo como owner, sem membership: nao ha formulario proprio.
    if (!member) return { form: null, canConfigure: false };

    const form = await this.forms.findByOrgAndUser(input.orgId, member.userId);
    return { form, canConfigure: true };
  }
}
