import * as schema from "../../../../database/schema";
import { CustomerSelfRegistrationEntity } from "../../domain/customer-self-registration.entity";
import { CustomerUpdateInvitationEntity } from "../../domain/customer-update-invitation.entity";

/**
 * As colunas `status` de `customer_self_registrations`/`customer_update_invitations`
 * são `text` com CHECK constraint (não `pgEnum` — ver
 * `database/schema/studio/customer-self-service.ts`), então o Drizzle infere `string`,
 * não o union literal `"pending" | "submitted"` que as entidades de domínio exigem. O
 * CHECK garante no banco que só esses dois valores existem na coluna; o fallback para
 * `"pending"` abaixo é defensivo e não deveria disparar na prática.
 */
function toStatus(value: string): "pending" | "submitted" {
  return value === "submitted" ? "submitted" : "pending";
}

export function toCustomerSelfRegistrationDomain(
  row: typeof schema.customerSelfRegistrations.$inferSelect,
): CustomerSelfRegistrationEntity {
  return CustomerSelfRegistrationEntity.create({
    id: row.id,
    orgId: row.orgId,
    serviceTypeId: row.serviceTypeId ?? null,
    email: row.email,
    token: row.token,
    anamnesisResponseId: row.anamnesisResponseId ?? null,
    customerId: row.customerId ?? null,
    status: toStatus(row.status),
    expiresAt: row.expiresAt,
    submittedAt: row.submittedAt ?? null,
    createdBy: row.createdBy ?? null,
    createdAt: row.createdAt,
  });
}

export function toCustomerUpdateInvitationDomain(
  row: typeof schema.customerUpdateInvitations.$inferSelect,
): CustomerUpdateInvitationEntity {
  return CustomerUpdateInvitationEntity.create({
    id: row.id,
    orgId: row.orgId,
    customerId: row.customerId,
    token: row.token,
    status: toStatus(row.status),
    expiresAt: row.expiresAt,
    submittedAt: row.submittedAt ?? null,
    createdBy: row.createdBy ?? null,
    createdAt: row.createdAt,
  });
}
