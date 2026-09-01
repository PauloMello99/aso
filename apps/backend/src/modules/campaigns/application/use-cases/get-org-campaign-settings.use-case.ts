import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CAMPAIGN_DEFAULT_COPY } from "../../domain/campaign-copy";
import {
  IOrgCampaignSettingsWriteRepository,
  ORG_CAMPAIGN_SETTINGS_WRITE_REPOSITORY,
  type OrgCampaignSettingsView,
} from "../../domain/org-campaign-settings.repository.interface";

/**
 * Resposta do endpoint `campaign-settings` (T6 Bloco B). Os campos de
 * `OrgCampaignSettingsView` (camelCase) no topo + `defaults`: a copy autoral
 * imutável de cada gatilho, chaveada pelos nomes snake_case do enum de banco
 * (`post_service` | `birthday` | `inactivity`), para o frontend exibir como
 * placeholder/hint quando o texto custom está `null`.
 *
 * `campaignsEnabled`: estado do kill-switch global `CAMPAIGNS_ENABLED` (mesmo
 * gate do `RunCampaignTriggersUseCase`) — o frontend usa para decidir se mostra
 * o aviso "em preparação" ou a UI ativa.
 */
export interface OrgCampaignSettingsResponse extends OrgCampaignSettingsView {
  defaults: typeof CAMPAIGN_DEFAULT_COPY;
  campaignsEnabled: boolean;
}

/**
 * Leitura owner-scoped das settings de campanha da org (T6 Bloco B, F1).
 *
 * O contrato do endpoint SEMPRE devolve um objeto completo: quando a org ainda
 * não configurou nada (sem linha em `org_campaign_settings`), devolve os
 * DEFAULTS do banco — todas as flags `false`, `inactivityMonths: 6`, os 6
 * textos `null` — SEM criar a linha. `defaults` acompanha sempre, igual para
 * toda org (não depende da linha).
 */
@Injectable()
export class GetOrgCampaignSettingsUseCase {
  constructor(
    @Inject(ORG_CAMPAIGN_SETTINGS_WRITE_REPOSITORY)
    private readonly repo: IOrgCampaignSettingsWriteRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(orgId: string): Promise<OrgCampaignSettingsResponse> {
    // Mesmo gate do `RunCampaignTriggersUseCase` (kill-switch global).
    const campaignsEnabled =
      this.config.get<string>("CAMPAIGNS_ENABLED") === "true";

    const existing = await this.repo.findByOrgId(orgId);
    if (existing) {
      return { ...existing, defaults: CAMPAIGN_DEFAULT_COPY, campaignsEnabled };
    }

    return {
      orgId,
      postServiceEnabled: false,
      birthdayEnabled: false,
      inactivityEnabled: false,
      inactivityMonths: 6,
      postServiceSubject: null,
      postServiceBody: null,
      birthdaySubject: null,
      birthdayBody: null,
      inactivitySubject: null,
      inactivityBody: null,
      defaults: CAMPAIGN_DEFAULT_COPY,
      campaignsEnabled,
    };
  }
}
