import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import {
  GetMyQuoteFormOutput,
  GetMyQuoteFormUseCase,
} from "../application/use-cases/get-my-quote-form.use-case";
import { UpsertMyQuoteFormUseCase } from "../application/use-cases/upsert-my-quote-form.use-case";
import { QuoteFormRecord } from "../domain/quote-form.repository.interface";
import { UpsertMyQuoteFormDto } from "./dto/upsert-my-quote-form.dto";
import { PublicQuoteFormFeatureFlagGuard } from "./public-quote-form-feature-flag.guard";

// Sem OrgModuleGuard DE PROPOSITO: "me" serve de probe de disponibilidade (flag) e
// de configuracao do PROPRIO formulario; a caixa de entrada (modulo 'quotes') fica
// em QuoteRequestsController.
@Controller("orgs/:orgId/quote-forms")
// Flag primeiro: com a flag off, 404 uniforme antes de qualquer auth.
@UseGuards(PublicQuoteFormFeatureFlagGuard, AuthGuard, OrgMembershipGuard)
export class QuoteFormsController {
  constructor(
    private readonly getMyForm: GetMyQuoteFormUseCase,
    private readonly upsertMyForm: UpsertMyQuoteFormUseCase,
  ) {}

  @Get("me")
  getMine(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<GetMyQuoteFormOutput> {
    return this.getMyForm.execute({ orgId, authId: user.id });
  }

  @Put("me")
  upsertMine(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertMyQuoteFormDto,
  ): Promise<QuoteFormRecord> {
    return this.upsertMyForm.execute({
      orgId,
      authId: user.id,
      slug: dto.slug,
      displayName: dto.displayName,
      enabled: dto.enabled,
    });
  }
}
