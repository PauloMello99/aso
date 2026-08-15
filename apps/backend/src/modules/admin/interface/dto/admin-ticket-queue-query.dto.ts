import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import type { TicketStatus } from "../../../support/domain/ticket.entity";

const TICKET_STATUSES: TicketStatus[] = [
  "open",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
];

export class AdminTicketQueueQueryDto {
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: TicketStatus;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  orgId?: string;

  /** Quando true, restringe a tickets órfãos (org_id NULL) — FC-3. */
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === true || value === "true",
  )
  @IsBoolean()
  orphanOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
