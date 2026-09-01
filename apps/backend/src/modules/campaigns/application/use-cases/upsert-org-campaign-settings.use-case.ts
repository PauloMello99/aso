import { Inject, Injectable } from "@nestjs/common";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../../organizations/domain/org.repository.interface";
import { CampaignSettingsForbiddenException } from "../../domain/exceptions/campaign-settings-forbidden.exception";
import {
  IOrgCampaignSettingsWriteRepository,
  ORG_CAMPAIGN_SETTINGS_WRITE_REPOSITORY,
  type OrgCampaignSettingsView,
} from "../../domain/org-campaign-settings.repository.interface";

const INACTIVITY_MONTHS_MIN = 1;
const INACTIVITY_MONTHS_MAX = 36;

export interface UpsertOrgCampaignSettingsInput {
  orgId: string;
  authId: string;
  postServiceEnabled: boolean;
  birthdayEnabled: boolean;
  inactivityEnabled: boolean;
  inactivityMonths: number;
  postServiceSubject: string | null;
  postServiceBody: string | null;
  birthdaySubject: string | null;
  birthdayBody: string | null;
  inactivitySubject: string | null;
  inactivityBody: string | null;
}

/**
 * Trim + colapsa vazio/whitespace para `null`. Roda ANTES do repo: o CHECK do
 * banco (`btrim(col, E' \t\n\r') BETWEEN 1 AND N`) rejeita string vazia, então
 * `""` precisa virar `null` ("usar o default autoral") e não chegar como texto.
 */
function normalizeText(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Escrita owner-scoped das settings de campanha da org (T6 Bloco B, F1).
 *
 * Double-check de owner no use-case espelhando `UpsertPaymentFeesUseCase` do
 * caixa: o `OrgOwnerGuard` já barra no controller, mas o use-case revalida via
 * `orgRepo.isOwner` (que também trata `super_admin` como owner, ADR-0013).
 */
@Injectable()
export class UpsertOrgCampaignSettingsUseCase {
  constructor(
    @Inject(ORG_CAMPAIGN_SETTINGS_WRITE_REPOSITORY)
    private readonly repo: IOrgCampaignSettingsWriteRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
  ) {}

  async execute(
    input: UpsertOrgCampaignSettingsInput,
  ): Promise<OrgCampaignSettingsView> {
    const isOwner = await this.orgRepo.isOwner(input.orgId, input.authId);
    if (!isOwner) {
      throw new CampaignSettingsForbiddenException();
    }

    const inactivityMonths = Math.min(
      INACTIVITY_MONTHS_MAX,
      Math.max(INACTIVITY_MONTHS_MIN, Math.trunc(input.inactivityMonths)),
    );

    return this.repo.upsert(input.orgId, {
      postServiceEnabled: input.postServiceEnabled,
      birthdayEnabled: input.birthdayEnabled,
      inactivityEnabled: input.inactivityEnabled,
      inactivityMonths,
      postServiceSubject: normalizeText(input.postServiceSubject),
      postServiceBody: normalizeText(input.postServiceBody),
      birthdaySubject: normalizeText(input.birthdaySubject),
      birthdayBody: normalizeText(input.birthdayBody),
      inactivitySubject: normalizeText(input.inactivitySubject),
      inactivityBody: normalizeText(input.inactivityBody),
    });
  }
}
