import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { TiptapDoc } from "../../domain/campaign-body";
import {
  CAMPAIGN_DEFAULT_COPY,
  campaignDefaultBodyDoc,
} from "../../domain/campaign-copy";
import {
  CAMPAIGN_TRIGGERS,
  type CampaignTrigger,
} from "../../domain/campaign-trigger";
import type { Campaign } from "../../domain/campaign.entity";
import {
  CAMPAIGN_REPOSITORY,
  ICampaignRepository,
} from "../../domain/campaign.repository.interface";

/**
 * Resposta da listagem de campanhas da org (T6 rework, Fatia 6). Além das
 * campanhas já criadas:
 *
 *   - `campaignsEnabled`: kill-switch global `CAMPAIGNS_ENABLED` (mesmo gate do
 *     `RunCampaignTriggersUseCase` / `GetOrgCampaignSettingsUseCase`).
 *   - `availableTriggers`: gatilhos que a org ainda NÃO usou — alimenta o
 *     seletor da tela de criação (uma campanha por gatilho, unique
 *     `campaigns_org_trigger_uq`).
 *   - `defaults`: a copy autoral do produto por gatilho, com o corpo já em
 *     Tiptap-JSON (`campaignDefaultBodyDoc`), para o editor rich-text do
 *     frontend partir dela. Tokens NÃO são interpolados (placeholder editável).
 */
export interface ListCampaignsResponse {
  campaigns: Campaign[];
  campaignsEnabled: boolean;
  availableTriggers: CampaignTrigger[];
  defaults: Record<CampaignTrigger, { subject: string; body: TiptapDoc }>;
}

/**
 * Leitura para qualquer MEMBRO da org (o guard do controller é
 * `OrgMembershipGuard`; a policy de SELECT da migration 0066 é
 * `is_org_member(org_id)`). SEM double-check de owner — só as escritas
 * (create/update/delete) revalidam owner.
 */
@Injectable()
export class ListCampaignsUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY)
    private readonly repo: ICampaignRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(orgId: string): Promise<ListCampaignsResponse> {
    const campaignsEnabled =
      this.config.get<string>("CAMPAIGNS_ENABLED") === "true";

    const campaigns = await this.repo.findAllByOrg(orgId);

    const availableTriggers = CAMPAIGN_TRIGGERS.filter(
      (trigger) => !campaigns.some((campaign) => campaign.trigger === trigger),
    );

    // Literal explícito (não `reduce`): sob TS strict um acumulador daria
    // `Partial<Record<...>>` e exigiria cast; assim o compilador exige as três
    // chaves e quebra de propósito se um quarto gatilho for adicionado.
    const defaults: Record<
      CampaignTrigger,
      { subject: string; body: TiptapDoc }
    > = {
      post_service: {
        subject: CAMPAIGN_DEFAULT_COPY.post_service.subject,
        body: campaignDefaultBodyDoc("post_service"),
      },
      birthday: {
        subject: CAMPAIGN_DEFAULT_COPY.birthday.subject,
        body: campaignDefaultBodyDoc("birthday"),
      },
      inactivity: {
        subject: CAMPAIGN_DEFAULT_COPY.inactivity.subject,
        body: campaignDefaultBodyDoc("inactivity"),
      },
    };

    return { campaigns, campaignsEnabled, availableTriggers, defaults };
  }
}
