import { Inject, Injectable } from "@nestjs/common";
import { TicketEntity } from "../../domain/ticket.entity";
import {
  ITicketRepository,
  TICKET_REPOSITORY,
} from "../../domain/ticket.repository.interface";

export interface ListAdminTicketQueueInput {
  status?: string;
  categoryId?: string;
  orgId?: string;
  /** Quando true, restringe a tickets órfãos (org_id NULL) — FC-3. */
  orphanOnly?: boolean;
  page: number;
  pageSize: number;
}

export interface ListAdminTicketQueueResult {
  items: TicketEntity[];
  total: number;
}

@Injectable()
export class ListAdminTicketQueueUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepo: ITicketRepository,
  ) {}

  async execute(
    data: ListAdminTicketQueueInput,
  ): Promise<ListAdminTicketQueueResult> {
    return this.ticketRepo.listAllForAdminQueue({
      status: data.status,
      categoryId: data.categoryId,
      orgId: data.orgId,
      orphanOnly: data.orphanOnly,
      page: data.page,
      pageSize: data.pageSize,
    });
  }
}
