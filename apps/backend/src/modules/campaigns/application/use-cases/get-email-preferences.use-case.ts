import { Inject, Injectable } from "@nestjs/common";
import {
  CUSTOMER_EMAIL_PREFERENCE_REPOSITORY,
  ICustomerEmailPreferenceRepository,
} from "../../domain/customer-email-preference.repository.interface";
import { CampaignPreferencesNotFoundException } from "../../domain/exceptions/campaign-preferences-not-found.exception";

/**
 * Subset servido ao endpoint público de "gerenciar preferências" (sem sessão):
 * só o nome da org e os toggles. Sem `orgId` nem qualquer campo identificante —
 * o token já está na URL e os ids internos não vazam para contexto anônimo.
 */
export interface EmailPreferencesResult {
  orgName: string;
  postServiceEnabled: boolean;
  birthdayEnabled: boolean;
  inactivityEnabled: boolean;
  unsubscribedAll: boolean;
}

@Injectable()
export class GetEmailPreferencesUseCase {
  constructor(
    @Inject(CUSTOMER_EMAIL_PREFERENCE_REPOSITORY)
    private readonly prefRepo: ICustomerEmailPreferenceRepository,
  ) {}

  async execute(token: string): Promise<EmailPreferencesResult> {
    const view = await this.prefRepo.findByUnsubscribeToken(token);
    if (!view) throw new CampaignPreferencesNotFoundException();

    return {
      orgName: view.orgName,
      postServiceEnabled: view.postServiceEnabled,
      birthdayEnabled: view.birthdayEnabled,
      inactivityEnabled: view.inactivityEnabled,
      unsubscribedAll: view.unsubscribedAll,
    };
  }
}
