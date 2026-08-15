import { Inject, Injectable } from "@nestjs/common";
import { TicketEntity } from "../../domain/ticket.entity";
import {
  ITicketRepository,
  TICKET_REPOSITORY,
} from "../../domain/ticket.repository.interface";

export interface ListTicketsInput {
  orgId: string;
  status?: string;
  categoryId?: string;
  page: number;
  pageSize: number;
}

export interface ListTicketsResult {
  items: TicketEntity[];
  total: number;
}

@Injectable()
export class ListTicketsUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepo: ITicketRepository,
  ) {}

  async execute(data: ListTicketsInput): Promise<ListTicketsResult> {
    return this.ticketRepo.listByOrg(data.orgId, {
      status: data.status,
      categoryId: data.categoryId,
      page: data.page,
      pageSize: data.pageSize,
    });
  }
}
