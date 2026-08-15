import {
  Body,
  Controller,
  Get,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetMeUseCase } from "../../user/application/use-cases/get-me.use-case";
import { CreateTicketUseCase } from "../application/use-cases/create-ticket.use-case";
import { ListTicketsUseCase } from "../application/use-cases/list-tickets.use-case";
import { GetTicketDetailUseCase } from "../application/use-cases/get-ticket-detail.use-case";
import { AddCustomerResponseUseCase } from "../application/use-cases/add-customer-response.use-case";
import { ReopenTicketUseCase } from "../application/use-cases/reopen-ticket.use-case";
import { ListTicketCategoriesUseCase } from "../application/use-cases/list-ticket-categories.use-case";
import { UploadTicketAttachmentUseCase } from "../application/use-cases/upload-ticket-attachment.use-case";
import { GetTicketAttachmentUrlUseCase } from "../application/use-cases/get-ticket-attachment-url.use-case";
import { TicketEntity, TicketStatus } from "../domain/ticket.entity";
import { TicketResponseEntity } from "../domain/ticket-response.entity";
import { TicketAttachmentRecord } from "../domain/ticket-attachment.repository.interface";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { AddTicketResponseDto } from "./dto/add-ticket-response.dto";

interface UploadedFileData {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const TICKET_STATUSES: TicketStatus[] = [
  "open",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parsePage(page?: string): number {
  const parsed = page ? Number(page) : DEFAULT_PAGE;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PAGE;
}

function parsePageSize(pageSize?: string): number {
  const parsed = pageSize ? Number(pageSize) : DEFAULT_PAGE_SIZE;
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(parsed, MAX_PAGE_SIZE);
}

function parseStatus(status?: string): TicketStatus | undefined {
  return TICKET_STATUSES.includes(status as TicketStatus)
    ? (status as TicketStatus)
    : undefined;
}

function parseCategoryId(categoryId?: string): string | undefined {
  return categoryId && UUID_PATTERN.test(categoryId) ? categoryId : undefined;
}

export interface TicketView {
  id: string;
  orgId: string | null;
  categoryId: string;
  requesterName: string;
  requesterEmail: string;
  subject: string;
  description: string;
  status: TicketEntity["status"];
  priority: TicketEntity["priority"];
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  reopenedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketResponseView {
  id: string;
  ticketId: string;
  authorType: TicketResponseEntity["authorType"];
  authorUserId: string | null;
  body: string;
  createdAt: Date;
}

/**
 * Portal do cliente não pode ver estado interno de operação/SLA do ticket
 * (agente designado, timestamps de breach de SLA) — só o essencial pro
 * cliente acompanhar o próprio chamado.
 */
function toTicketView(ticket: TicketEntity): TicketView {
  return {
    id: ticket.id,
    orgId: ticket.orgId,
    categoryId: ticket.categoryId,
    requesterName: ticket.requesterName,
    requesterEmail: ticket.requesterEmail,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    firstResponseAt: ticket.firstResponseAt,
    resolvedAt: ticket.resolvedAt,
    closedAt: ticket.closedAt,
    reopenedAt: ticket.reopenedAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

function toTicketResponseView(
  response: TicketResponseEntity,
): TicketResponseView {
  return {
    id: response.id,
    ticketId: response.ticketId,
    authorType: response.authorType,
    authorUserId: response.authorUserId,
    body: response.body,
    createdAt: response.createdAt,
  };
}

export interface TicketAttachmentView {
  id: string;
  ticketId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}

function toTicketAttachmentView(
  attachment: TicketAttachmentRecord,
): TicketAttachmentView {
  return {
    id: attachment.id,
    ticketId: attachment.ticketId,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    createdAt: attachment.createdAt,
  };
}

@Controller("orgs/:orgId/support")
@UseGuards(AuthGuard, OrgMembershipGuard)
export class SupportController {
  constructor(
    private readonly getMe: GetMeUseCase,
    private readonly createTicket: CreateTicketUseCase,
    private readonly listTickets: ListTicketsUseCase,
    private readonly getTicketDetail: GetTicketDetailUseCase,
    private readonly addCustomerResponse: AddCustomerResponseUseCase,
    private readonly reopenTicket: ReopenTicketUseCase,
    private readonly listTicketCategories: ListTicketCategoriesUseCase,
    private readonly uploadTicketAttachment: UploadTicketAttachmentUseCase,
    private readonly getTicketAttachmentUrl: GetTicketAttachmentUrlUseCase,
  ) {}

  @Get("categories")
  async categories(@Param("orgId", ParseUUIDPipe) orgId: string) {
    // Categorias são globais (não escopadas por org); orgId só existe
    // pela rota compartilhada com os demais endpoints do controller.
    // Mantém @Param + ParseUUIDPipe por consistência com as outras rotas.
    void orgId;
    return this.listTicketCategories.execute();
  }

  @Get("tickets")
  async list(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Query("status") status?: string,
    @Query("categoryId") categoryId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const result = await this.listTickets.execute({
      orgId,
      status: parseStatus(status),
      categoryId: parseCategoryId(categoryId),
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
    return {
      items: result.items.map(toTicketView),
      total: result.total,
    };
  }

  @Get("tickets/:id")
  async findOne(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const result = await this.getTicketDetail.execute({
      orgId,
      ticketId: id,
    });
    return {
      ticket: toTicketView(result.ticket),
      responses: result.responses.map(toTicketResponseView),
      attachments: result.attachments.map(toTicketAttachmentView),
    };
  }

  @Post("tickets")
  async create(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Body() dto: CreateTicketDto,
    @CurrentUser() authUser: AuthUser,
  ) {
    // requesterName/requesterEmail vêm do usuário autenticado (tabela
    // `users`), nunca do payload: o portal só permite abrir chamado logado,
    // e confiar em nome/email enviados pelo cliente permitiria falsificação.
    const user = await this.getMe.execute(authUser);
    const ticket = await this.createTicket.execute({
      orgId,
      createdBy: user.id,
      requesterName: user.name,
      requesterEmail: user.email,
      subject: dto.subject,
      description: dto.description,
      categorySystemKey: dto.categorySystemKey,
    });
    return toTicketView(ticket);
  }

  @Post("tickets/:id/responses")
  async addResponse(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AddTicketResponseDto,
    @CurrentUser() authUser: AuthUser,
  ) {
    const user = await this.getMe.execute(authUser);
    const response = await this.addCustomerResponse.execute({
      orgId,
      ticketId: id,
      userId: user.id,
      body: dto.body,
    });
    return toTicketResponseView(response);
  }

  @Post("tickets/:id/reopen")
  async reopen(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const ticket = await this.reopenTicket.execute({ orgId, ticketId: id });
    return toTicketView(ticket);
  }

  @Post("tickets/:id/attachments")
  @UseInterceptors(FileInterceptor("file"))
  async uploadAttachment(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() authUser: AuthUser,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true }))
    file: UploadedFileData,
  ) {
    const user = await this.getMe.execute(authUser);
    const attachment = await this.uploadTicketAttachment.execute({
      orgId,
      ticketId: id,
      uploadedBy: user.id,
      file: {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
    });
    return toTicketAttachmentView(attachment);
  }

  @Get("attachments/:attachmentId/url")
  async getAttachmentUrl(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("attachmentId", ParseUUIDPipe) attachmentId: string,
  ) {
    const url = await this.getTicketAttachmentUrl.execute({
      orgId,
      attachmentId,
    });
    return { url };
  }
}
