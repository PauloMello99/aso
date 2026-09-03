import { Inject, Injectable } from "@nestjs/common";
import type { CampaignTrigger } from "../../domain/campaign-trigger";
import {
  CUSTOMER_EMAIL_PREFERENCE_REPOSITORY,
  ICustomerEmailPreferenceRepository,
} from "../../domain/customer-email-preference.repository.interface";
import { CampaignPreferencesNotFoundException } from "../../domain/exceptions/campaign-preferences-not-found.exception";

/**
 * Opt-out pelo endpoint público (sem sessão). Sem `trigger` desliga todas as
 * campanhas; com `trigger` desliga só aquele gatilho. Idempotente — o repo
 * preserva o 1º instante do opt-out global e uma 2ª chamada com o mesmo token
 * ainda devolve `true`. `false` do repo significa token inexistente.
 */
@Injectable()
export class UnsubscribeFromCampaignsUseCase {
  constructor(
    @Inject(CUSTOMER_EMAIL_PREFERENCE_REPOSITORY)
    private readonly prefRepo: ICustomerEmailPreferenceRepository,
  ) {}

  async execute(token: string, trigger?: CampaignTrigger): Promise<void> {
    const found = trigger
      ? await this.prefRepo.unsubscribeTrigger(token, trigger)
      : await this.prefRepo.unsubscribeAll(token, new Date());

    if (!found) throw new CampaignPreferencesNotFoundException();
  }
}
