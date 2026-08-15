import { Inject, Injectable } from "@nestjs/common";
import {
  ITicketCategoryRepository,
  TICKET_CATEGORY_REPOSITORY,
  TicketCategory,
} from "../../domain/ticket-category.repository.interface";

@Injectable()
export class ListTicketCategoriesUseCase {
  constructor(
    @Inject(TICKET_CATEGORY_REPOSITORY)
    private readonly ticketCategoryRepo: ITicketCategoryRepository,
  ) {}

  async execute(): Promise<TicketCategory[]> {
    return this.ticketCategoryRepo.listEnabled();
  }
}
