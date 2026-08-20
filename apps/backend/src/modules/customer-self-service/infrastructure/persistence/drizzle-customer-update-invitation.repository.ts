// Por que DRIZZLE vs DRIZZLE_ADMIN neste repositório: mesmo racional do
// `drizzle-customer-self-registration.repository.ts` (ler o comentário lá para o
// detalhe completo). Resumo: `create`, `findPendingByCustomer` e `delete` rodam
// autenticados e têm policy (SELECT/INSERT/DELETE, DELETE restrita a
// status='pending') na 0052 — usam DRIZZLE. `findByToken` e `markSubmitted` rodam no
// caminho público via token, sem sessão, e a 0052 não tem policy de UPDATE para
// `customer_update_invitations` — usam DRIZZLE_ADMIN, com `id`/`status='pending'`
// no WHERE como defesa em profundidade.
import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { CustomerUpdateInvitationEntity } from "../../domain/customer-update-invitation.entity";
import type {
  CreateCustomerUpdateInvitationData,
  CustomerUpdateInvitationWithContext,
  ICustomerUpdateInvitationRepository,
} from "../../domain/customer-update-invitation.repository.interface";
import { toCustomerUpdateInvitationDomain } from "./customer-self-service.mapper";

@Injectable()
export class DrizzleCustomerUpdateInvitationRepository
  implements ICustomerUpdateInvitationRepository
{
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  async create(
    data: CreateCustomerUpdateInvitationData,
  ): Promise<CustomerUpdateInvitationEntity> {
    const [row] = await this.db
      .insert(schema.customerUpdateInvitations)
      .values({
        orgId: data.orgId,
        customerId: data.customerId,
        createdBy: data.createdBy,
      })
      .returning();

    if (!row) throw new Error("Failed to create customer update invitation");
    return toCustomerUpdateInvitationDomain(row);
  }

  async findPendingByCustomer(
    orgId: string,
    customerId: string,
  ): Promise<CustomerUpdateInvitationEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.customerUpdateInvitations)
      .where(
        and(
          eq(schema.customerUpdateInvitations.orgId, orgId),
          eq(schema.customerUpdateInvitations.customerId, customerId),
          eq(schema.customerUpdateInvitations.status, "pending"),
        ),
      )
      .limit(1);

    return row ? toCustomerUpdateInvitationDomain(row) : null;
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(schema.customerUpdateInvitations)
      .where(eq(schema.customerUpdateInvitations.id, id));
  }

  async findByToken(
    token: string,
  ): Promise<CustomerUpdateInvitationWithContext | null> {
    const [row] = await this.admin
      .select({
        invitation: schema.customerUpdateInvitations,
        organizationName: schema.organizations.name,
        customerName: schema.customers.name,
        customerEmail: schema.customers.email,
        customerPhone: schema.customers.phone,
        customerBirthDate: schema.customers.birthDate,
        customerAddress: schema.customers.address,
        customerNumber: schema.customers.number,
        customerAddressLine2: schema.customers.addressLine2,
        customerCity: schema.customers.city,
        customerState: schema.customers.state,
        customerPostalCode: schema.customers.postalCode,
        customerCountry: schema.customers.country,
      })
      .from(schema.customerUpdateInvitations)
      .innerJoin(
        schema.organizations,
        eq(schema.organizations.id, schema.customerUpdateInvitations.orgId),
      )
      .innerJoin(
        schema.customers,
        and(
          eq(
            schema.customers.id,
            schema.customerUpdateInvitations.customerId,
          ),
          eq(schema.customers.orgId, schema.customerUpdateInvitations.orgId),
        ),
      )
      .where(eq(schema.customerUpdateInvitations.token, token))
      .limit(1);

    if (!row) return null;

    const entity = toCustomerUpdateInvitationDomain(row.invitation);
    return Object.assign(entity, {
      organizationName: row.organizationName,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone ?? null,
      customerBirthDate: row.customerBirthDate,
      customerAddress: row.customerAddress,
      customerNumber: row.customerNumber,
      customerAddressLine2: row.customerAddressLine2 ?? null,
      customerCity: row.customerCity,
      customerState: row.customerState,
      customerPostalCode: row.customerPostalCode ?? null,
      customerCountry: row.customerCountry ?? null,
    });
  }

  async markSubmitted(id: string): Promise<boolean> {
    const updated = await this.admin
      .update(schema.customerUpdateInvitations)
      .set({
        status: "submitted",
        submittedAt: new Date(),
      })
      .where(
        and(
          eq(schema.customerUpdateInvitations.id, id),
          eq(schema.customerUpdateInvitations.status, "pending"),
        ),
      )
      .returning({ id: schema.customerUpdateInvitations.id });

    return updated.length > 0;
  }
}
