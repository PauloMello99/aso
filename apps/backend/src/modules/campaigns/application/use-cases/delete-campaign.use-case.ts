import { Inject, Injectable } from "@nestjs/common";
import { AuditService } from "../../../audit/audit.service";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../../organizations/domain/org.repository.interface";
import {
  CAMPAIGN_REPOSITORY,
  ICampaignRepository,
} from "../../domain/campaign.repository.interface";
import { CampaignNotFoundException } from "../../domain/exceptions/campaign-not-found.exception";
import { CampaignSettingsForbiddenException } from "../../domain/exceptions/campaign-settings-forbidden.exception";

export interface DeleteCampaignInput {
  orgId: string;
  authId: string;
  id: string;
}

/**
 * Exclusão de campanha do DONO da org (T6 rework, Fatia 6). Molde
 * `DeleteTransactionCategoryUseCase`: carrega a entidade (precisa do `trigger`
 * para o metadata do audit), depois deleta.
 *
 * Double-check de owner espelhando `UpsertOrgCampaignSettingsUseCase`
 * (`super_admin` age como owner, ADR-0013).
 *
 * NÃO remove imagens do bucket `campaign-images`: imagens órfãs são deixadas de
 * propósito — mesmo racional do `unsubscribe_token` que nunca rotaciona
 * (ADR-0025): não quebrar e-mails já entregues que referenciam a imagem.
 *
 * Auditoria: `campaign_settings_updated` com `metadata.operation: "deleted"`
 * (ação compartilhada com create/update).
 */
@Injectable()
export class DeleteCampaignUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY)
    private readonly repo: ICampaignRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(input: DeleteCampaignInput): Promise<void> {
    const isOwner = await this.orgRepo.isOwner(input.orgId, input.authId);
    if (!isOwner) {
      throw new CampaignSettingsForbiddenException();
    }

    const found = await this.repo.findByIdAndOrg(input.id, input.orgId);
    if (!found) {
      throw new CampaignNotFoundException();
    }

    const deleted = await this.repo.delete(input.id, input.orgId);
    if (!deleted) {
      // Corrida com outro delete concorrente.
      throw new CampaignNotFoundException();
    }

    await this.auditService.logByAuthId(input.authId, {
      orgId: input.orgId,
      action: "campaign_settings_updated",
      entityType: "campaign",
      entityId: input.id,
      metadata: {
        operation: "deleted",
        trigger: found.trigger,
        campaignId: input.id,
      },
    });
  }
}
