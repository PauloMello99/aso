import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from "@nestjs/common";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { OrgOwnerGuard } from "../../auth/guards/org-owner.guard";
import {
  GetOrgCampaignSettingsUseCase,
  type OrgCampaignSettingsResponse,
} from "../application/use-cases/get-org-campaign-settings.use-case";
import { UpsertOrgCampaignSettingsUseCase } from "../application/use-cases/upsert-org-campaign-settings.use-case";
import { UpsertOrgCampaignSettingsDto } from "./dto/upsert-org-campaign-settings.dto";

/**
 * Configuração de campanhas de e-mail da org (T6 Bloco B, F1).
 *
 * Leitura: qualquer membro (RLS SELECT = `is_org_member`). Escrita: só o dono
 * (`OrgOwnerGuard` + RLS INSERT/UPDATE = `is_org_owner`; `super_admin` age como
 * dono, ADR-0013). O `GET` sempre devolve um objeto completo — os defaults do
 * banco quando a org ainda não configurou nada. `GET` e `PUT` devolvem o mesmo
 * shape — o `PUT` delega a leitura ao `GetOrgCampaignSettingsUseCase` após gravar:
 * os campos da view + `defaults` (a copy autoral imutável por gatilho, usada como
 * placeholder/hint dos textos custom) + `campaignsEnabled` (kill-switch global).
 */
@Controller("orgs/:orgId/campaign-settings")
@UseGuards(AuthGuard, OrgMembershipGuard)
export class CampaignSettingsController {
  constructor(
    private readonly getOrgCampaignSettings: GetOrgCampaignSettingsUseCase,
    private readonly upsertOrgCampaignSettings: UpsertOrgCampaignSettingsUseCase,
  ) {}

  @Get()
  async get(
    @Param("orgId", ParseUUIDPipe) orgId: string,
  ): Promise<OrgCampaignSettingsResponse> {
    return this.getOrgCampaignSettings.execute(orgId);
  }

  @Put()
  @UseGuards(OrgOwnerGuard)
  async put(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Body() dto: UpsertOrgCampaignSettingsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<OrgCampaignSettingsResponse> {
    await this.upsertOrgCampaignSettings.execute({
      orgId,
      authId: user.id,
      postServiceEnabled: dto.postServiceEnabled,
      birthdayEnabled: dto.birthdayEnabled,
      inactivityEnabled: dto.inactivityEnabled,
      inactivityMonths: dto.inactivityMonths,
      postServiceSubject: dto.postServiceSubject ?? null,
      postServiceBody: dto.postServiceBody ?? null,
      birthdaySubject: dto.birthdaySubject ?? null,
      birthdayBody: dto.birthdayBody ?? null,
      inactivitySubject: dto.inactivitySubject ?? null,
      inactivityBody: dto.inactivityBody ?? null,
    });
    // Mesma leitura do GET (mesma conexão DRIZZLE/RLS no request) para o PUT
    // devolver um shape idêntico, incluindo `campaignsEnabled`.
    return this.getOrgCampaignSettings.execute(orgId);
  }
}
