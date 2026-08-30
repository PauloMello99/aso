import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import type { AuditAction } from "../../../audit/audit.service";

// Manter em sincronia com auditActionEnum (database/schema/enums.ts) e a union
// AuditAction (audit/audit.service.ts). Lista exaustiva para o filtro do painel /admin.
const AUDIT_ACTIONS: AuditAction[] = [
  "create",
  "update",
  "delete",
  "invite_sent",
  "invite_accepted",
  "subscription_changed",
  "anamnesis_invite_sent",
  "customer_self_registration_invite_sent",
  "customer_self_registered",
  "customer_update_invite_sent",
  "customer_self_updated",
  "anamnesis_invite_resent",
  "anamnesis_copy_sent",
  "cashier_transaction_created",
  "cashier_fees_updated",
  "cashier_commissions_updated",
  "org_admin_access",
];

export class AuditLogsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsUUID()
  orgId?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsOptional()
  @IsIn(AUDIT_ACTIONS)
  action?: AuditAction;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
