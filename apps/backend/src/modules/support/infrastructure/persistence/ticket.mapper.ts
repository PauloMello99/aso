import type {
  Ticket as TicketRow,
  TicketResponse as TicketResponseRow,
} from "../../../../database/schema/support/tickets";
import type { TicketCategory as TicketCategoryRow } from "../../../../database/schema/support/ticket-categories";
import { TicketEntity } from "../../domain/ticket.entity";
import { TicketResponseEntity } from "../../domain/ticket-response.entity";
import type { TicketCategory } from "../../domain/ticket-category.repository.interface";

export class TicketMapper {
  static toDomain(row: TicketRow): TicketEntity {
    return TicketEntity.fromProps({
      id: row.id,
      orgId: row.orgId,
      categoryId: row.categoryId,
      createdBy: row.createdBy ?? null,
      requesterName: row.requesterName,
      requesterEmail: row.requesterEmail,
      subject: row.subject,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assignedAgentId: row.assignedAgentId ?? null,
      firstResponseAt: row.firstResponseAt ?? null,
      resolvedAt: row.resolvedAt ?? null,
      closedAt: row.closedAt ?? null,
      reopenedAt: row.reopenedAt ?? null,
      slaFirstResponseDueAt: row.slaFirstResponseDueAt,
      slaResolutionDueAt: row.slaResolutionDueAt,
      slaFirstResponseBreachedAt: row.slaFirstResponseBreachedAt ?? null,
      slaResolutionBreachedAt: row.slaResolutionBreachedAt ?? null,
      slaWarningNotifiedAt: row.slaWarningNotifiedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toResponseDomain(row: TicketResponseRow): TicketResponseEntity {
    return TicketResponseEntity.create({
      id: row.id,
      ticketId: row.ticketId,
      orgId: row.orgId,
      authorType: row.authorType,
      authorUserId: row.authorUserId ?? null,
      body: row.body,
      isInternalNote: row.isInternalNote,
      createdAt: row.createdAt,
    });
  }

  static toCategoryDomain(row: TicketCategoryRow): TicketCategory {
    return {
      id: row.id,
      systemKey: row.systemKey,
      label: row.label,
      slaFirstResponseMinutes: row.slaFirstResponseMinutes,
      slaResolutionMinutes: row.slaResolutionMinutes,
      enabled: row.enabled,
      createdAt: row.createdAt,
    };
  }
}
