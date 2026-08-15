import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { PlatformAdminGuard } from "../../auth/guards/platform-admin.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetMeUseCase } from "../../user/application/use-cases/get-me.use-case";
import { ListAdminTicketQueueUseCase } from "../../support/application/use-cases/list-admin-ticket-queue.use-case";
import { GetAdminTicketDetailUseCase } from "../../support/application/use-cases/get-admin-ticket-detail.use-case";
import { AssignTicketUseCase } from "../../support/application/use-cases/assign-ticket.use-case";
import { AddAgentResponseUseCase } from "../../support/application/use-cases/add-agent-response.use-case";
import { ChangeTicketStatusUseCase } from "../../support/application/use-cases/change-ticket-status.use-case";
import { LinkTicketToOrganizationUseCase } from "../../support/application/use-cases/link-ticket-to-organization.use-case";
import { GetAdminTicketAttachmentUrlUseCase } from "../../support/application/use-cases/get-admin-ticket-attachment-url.use-case";
import { TicketResponseEntity } from "../../support/domain/ticket-response.entity";
import { AdminTicketQueueQueryDto } from "./dto/admin-ticket-queue-query.dto";
import { AssignTicketDto } from "./dto/assign-ticket.dto";
import { AddAgentResponseDto } from "./dto/add-agent-response.dto";
import { ChangeTicketStatusDto } from "./dto/change-ticket-status.dto";
import { LinkTicketOrganizationDto } from "./dto/link-ticket-organization.dto";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export interface AdminTicketResponseView {
  id: string;
  ticketId: string;
  authorType: TicketResponseEntity["authorType"];
  authorUserId: string | null;
  body: string;
  isInternalNote: boolean;
  createdAt: Date;
}

/**
 * Diferente da view do portal (`toTicketResponseView` em
 * `support.controller.ts`), expõe `isInternalNote` — a fila admin precisa
 * distinguir nota interna de resposta visível ao cliente.
 */
function toAdminTicketResponseView(
  response: TicketResponseEntity,
): AdminTicketResponseView {
  return {
    id: response.id,
    ticketId: response.ticketId,
    authorType: response.authorType,
    authorUserId: response.authorUserId,
    body: response.body,
    isInternalNote: response.isInternalNote,
    createdAt: response.createdAt,
  };
}

/**
 * Fila de atendimento da equipe interna (cross-org). Protegida pelo mesmo
 * guard de plataforma das demais rotas admin — separada de AdminController
 * por coesão (o domínio de tickets tem shape próprio, distinto de
 * orgs/users/audit).
 */
@Controller("admin/support")
@UseGuards(AuthGuard, PlatformAdminGuard)
export class AdminSupportController {
  constructor(
    private readonly getMe: GetMeUseCase,
    private readonly listAdminTicketQueue: ListAdminTicketQueueUseCase,
    private readonly getAdminTicketDetail: GetAdminTicketDetailUseCase,
    private readonly assignTicket: AssignTicketUseCase,
    private readonly addAgentResponse: AddAgentResponseUseCase,
    private readonly changeTicketStatus: ChangeTicketStatusUseCase,
    private readonly linkTicketToOrganization: LinkTicketToOrganizationUseCase,
    private readonly getAdminTicketAttachmentUrl: GetAdminTicketAttachmentUrlUseCase,
  ) {}

  @Get("tickets")
  async list(@Query() query: AdminTicketQueueQueryDto) {
    return this.listAdminTicketQueue.execute({
      status: query.status,
      categoryId: query.categoryId,
      orgId: query.orgId,
      orphanOnly: query.orphanOnly,
      page: query.page ?? DEFAULT_PAGE,
      pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
    });
  }

  @Get("tickets/:id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const result = await this.getAdminTicketDetail.execute({ ticketId: id });
    return {
      ticket: result.ticket,
      responses: result.responses.map(toAdminTicketResponseView),
      attachments: result.attachments,
    };
  }

  @Post("tickets/:id/assign")
  async assign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignTicketDto,
    @CurrentUser() authUser: AuthUser,
  ) {
    const agentUserId =
      dto.agentUserId ?? (await this.getMe.execute(authUser)).id;
    return this.assignTicket.execute({ ticketId: id, agentUserId });
  }

  @Post("tickets/:id/responses")
  async addResponse(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AddAgentResponseDto,
    @CurrentUser() authUser: AuthUser,
  ) {
    const user = await this.getMe.execute(authUser);
    return this.addAgentResponse.execute({
      ticketId: id,
      agentUserId: user.id,
      body: dto.body,
      isInternalNote: dto.isInternalNote ?? false,
    });
  }

  @Patch("tickets/:id/status")
  async changeStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ChangeTicketStatusDto,
  ) {
    return this.changeTicketStatus.execute({
      ticketId: id,
      targetStatus: dto.targetStatus,
    });
  }

  @Post("tickets/:id/link-organization")
  async linkOrganization(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: LinkTicketOrganizationDto,
  ) {
    return this.linkTicketToOrganization.execute({
      ticketId: id,
      orgId: dto.orgId,
    });
  }

  @Get("attachments/:attachmentId/url")
  async getAttachmentUrl(
    @Param("attachmentId", ParseUUIDPipe) attachmentId: string,
  ) {
    const url = await this.getAdminTicketAttachmentUrl.execute({
      attachmentId,
    });
    return { url };
  }
}
