import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  GetEmailPreferencesUseCase,
  type EmailPreferencesResult,
} from "../application/use-cases/get-email-preferences.use-case";
import { UnsubscribeFromCampaignsUseCase } from "../application/use-cases/unsubscribe-from-campaigns.use-case";
import { UnsubscribeFromCampaignsDto } from "./dto/unsubscribe-from-campaigns.dto";

interface UnsubscribeResponse {
  ok: true;
}

/**
 * Endpoint público (sem `AuthGuard`) da página de preferências/descadastro de
 * e-mails de campanha. Autenticação é o `unsubscribeToken` opaco na URL (hex de
 * 64 chars — NÃO um UUID, então nada de `ParseUUIDPipe`). Token inexistente cai
 * em `CAMPAIGN_PREFERENCES_NOT_FOUND` -> 404 via `DomainExceptionFilter`.
 */
@Controller("public/campaigns")
export class PublicCampaignsController {
  constructor(
    private readonly getEmailPreferences: GetEmailPreferencesUseCase,
    private readonly unsubscribeFromCampaigns: UnsubscribeFromCampaignsUseCase,
  ) {}

  @Get("preferences/:token")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async preferences(
    @Param("token") token: string,
  ): Promise<EmailPreferencesResult> {
    return this.getEmailPreferences.execute(token);
  }

  @Post("unsubscribe/:token")
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @HttpCode(200)
  async unsubscribe(
    @Param("token") token: string,
    @Body() dto: UnsubscribeFromCampaignsDto,
  ): Promise<UnsubscribeResponse> {
    await this.unsubscribeFromCampaigns.execute(token, dto.trigger);
    return { ok: true };
  }
}
