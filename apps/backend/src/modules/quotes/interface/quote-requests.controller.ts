import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { OrgModuleGuard } from "../../auth/guards/org-module.guard";
import { RequireModule } from "../../auth/decorators/require-module.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import {
  ListQuoteRequestsOutput,
  ListQuoteRequestsUseCase,
} from "../application/use-cases/list-quote-requests.use-case";
import {
  GetQuoteRequestUseCase,
  QuoteRequestDetailView,
} from "../application/use-cases/get-quote-request.use-case";
import { CountUnreadQuoteRequestsUseCase } from "../application/use-cases/count-unread-quote-requests.use-case";
import { MarkQuoteRequestViewedUseCase } from "../application/use-cases/mark-quote-request-viewed.use-case";
import {
  ScheduleQuoteRequestOutput,
  ScheduleQuoteRequestUseCase,
} from "../application/use-cases/schedule-quote-request.use-case";
import {
  DeclineQuoteRequestOutput,
  DeclineQuoteRequestUseCase,
} from "../application/use-cases/decline-quote-request.use-case";
import { ActiveSubscriptionGuard } from "../../subscriptions/interface/guards/active-subscription.guard";
import { ListQuoteRequestsQueryDto } from "./dto/list-quote-requests-query.dto";
import { ScheduleQuoteRequestDto } from "./dto/schedule-quote-request.dto";
import { PublicQuoteFormFeatureFlagGuard } from "./public-quote-form-feature-flag.guard";

// Caixa de entrada: org do path + OrgMembershipGuard; o escopo (owner x proprio
// profissional) e derivado da sessao nos use-cases, nunca do cliente.
@Controller("orgs/:orgId/quotes")
// Flag primeiro: com a flag off, 404 uniforme antes de qualquer auth.
@UseGuards(
  PublicQuoteFormFeatureFlagGuard,
  AuthGuard,
  OrgMembershipGuard,
  OrgModuleGuard,
)
@RequireModule("quotes")
export class QuoteRequestsController {
  constructor(
    private readonly listRequests: ListQuoteRequestsUseCase,
    private readonly countUnread: CountUnreadQuoteRequestsUseCase,
    private readonly getRequest: GetQuoteRequestUseCase,
    private readonly markViewed: MarkQuoteRequestViewedUseCase,
    private readonly scheduleRequest: ScheduleQuoteRequestUseCase,
    private readonly declineRequest: DeclineQuoteRequestUseCase,
  ) {}

  @Get()
  @Header("Cache-Control", "no-store")
  list(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: ListQuoteRequestsQueryDto,
  ): Promise<ListQuoteRequestsOutput> {
    return this.listRequests.execute({
      orgId,
      authId: user.id,
      page: query.page,
      limit: query.limit,
    });
  }

  // Declarada ANTES de ":id" para que "unread-count" nao seja capturado como id.
  @Get("unread-count")
  @Header("Cache-Control", "no-store")
  unreadCount(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ unread: number }> {
    return this.countUnread.execute({ orgId, authId: user.id });
  }

  // no-store: a resposta carrega URLs assinadas de curta duracao e PII.
  @Get(":id")
  @Header("Cache-Control", "no-store")
  detail(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<QuoteRequestDetailView> {
    return this.getRequest.execute({ orgId, authId: user.id, id });
  }

  // "Agendou": ActiveSubscriptionGuard em paridade com POST /calendar. Responde so
  // ids/horarios (nunca a entidade: titulo e e-mail do evento sao PII).
  @Post(":id/schedule")
  @HttpCode(200)
  @UseGuards(ActiveSubscriptionGuard)
  @Header("Cache-Control", "no-store")
  schedule(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ScheduleQuoteRequestDto,
  ): Promise<ScheduleQuoteRequestOutput> {
    return this.scheduleRequest.execute({
      orgId,
      authId: user.id,
      id,
      startsAt: new Date(dto.startsAt),
      durationMinutes: dto.durationMinutes,
    });
  }

  // "Nao agendou": SEM ActiveSubscriptionGuard de proposito. So remove dados
  // pessoais; a minimizacao (LGPD) nao pode ser bloqueada por assinatura.
  @Post(":id/decline")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  decline(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<DeclineQuoteRequestOutput> {
    return this.declineRequest.execute({ orgId, authId: user.id, id });
  }

  @Post(":id/viewed")
  @HttpCode(204)
  async viewed(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.markViewed.execute({ orgId, authId: user.id, id });
  }
}
