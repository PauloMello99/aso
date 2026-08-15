import { IsIn } from "class-validator";
import type { ChangeableTicketStatus } from "../../../support/application/use-cases/change-ticket-status.use-case";

export const CHANGEABLE_TICKET_STATUSES: ChangeableTicketStatus[] = [
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
];

export class ChangeTicketStatusDto {
  @IsIn(CHANGEABLE_TICKET_STATUSES)
  targetStatus!: ChangeableTicketStatus;
}
