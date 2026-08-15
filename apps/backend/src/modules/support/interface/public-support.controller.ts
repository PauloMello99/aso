import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { CreatePublicTicketUseCase } from "../application/use-cases/create-public-ticket.use-case";
import { ListTicketCategoriesUseCase } from "../application/use-cases/list-ticket-categories.use-case";
import { CreatePublicTicketDto } from "./dto/create-public-ticket.dto";
import { PublicSupportFeatureFlagGuard } from "./public-support-feature-flag.guard";
import { extractRequestContext } from "../../anamnesis/interface/request-context";

interface CreatePublicTicketResponse {
  ticketId: string;
}

@Controller("public/support")
@UseGuards(PublicSupportFeatureFlagGuard)
export class PublicSupportController {
  constructor(
    private readonly listTicketCategories: ListTicketCategoriesUseCase,
    private readonly createPublicTicket: CreatePublicTicketUseCase,
  ) {}

  @Get("categories")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async categories() {
    return this.listTicketCategories.execute();
  }

  @Post("tickets")
  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  @HttpCode(201)
  async create(
    @Body() dto: CreatePublicTicketDto,
    @Req() req: Request,
  ): Promise<CreatePublicTicketResponse> {
    const { ip } = extractRequestContext(req);
    // Retorna só o id: o chamador é anônimo, então status/SLA/priority do
    // ticket não devem ser expostos (poderia vazar operação interna a
    // qualquer um que soubesse o endpoint).
    const ticket = await this.createPublicTicket.execute({
      requesterName: dto.requesterName,
      requesterEmail: dto.requesterEmail,
      subject: dto.subject,
      description: dto.description,
      categorySystemKey: dto.categorySystemKey,
      captchaToken: dto.turnstileToken,
      remoteIp: ip ?? undefined,
    });
    return { ticketId: ticket.id };
  }
}
