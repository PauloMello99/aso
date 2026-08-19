// Por que DRIZZLE vs DRIZZLE_ADMIN neste repositório:
// `create`, `findPendingByEmail` e `delete` rodam em caminhos AUTENTICADOS (admin da
// organização criando/cancelando um convite de auto-cadastro) — a migration 0052 tem
// policies de SELECT/INSERT/DELETE (DELETE restrita a status='pending') para
// `customer_self_registrations`, então usam DRIZZLE normalmente.
// `findByToken`, `linkCustomer` e `markSubmitted` rodam no caminho PÚBLICO (sem sessão,
// acionados pelo token do convite) — a 0052 deliberadamente NÃO tem policy de UPDATE
// para esta tabela (ver comentário no final da migration: "a transição pending ->
// submitted roda sempre via DRIZZLE_ADMIN"), então qualquer UPDATE (inclusive
// `linkCustomer`) precisa de DRIZZLE_ADMIN. `findByToken` também usa admin porque não há
// sessão/claims para a policy de SELECT avaliar. Como DRIZZLE_ADMIN faz bypass total de
// RLS, os métodos admin filtram por `id`/`status='pending'` como defesa em profundidade
// (mesmo padrão de `drizzle-public-customer-writer.ts`).
import { Inject, Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { CustomerSelfRegistrationEntity } from "../../domain/customer-self-registration.entity";
import type {
  CreateCustomerSelfRegistrationData,
  CustomerSelfRegistrationWithContext,
  ICustomerSelfRegistrationRepository,
} from "../../domain/customer-self-registration.repository.interface";
import { toCustomerSelfRegistrationDomain } from "./customer-self-service.mapper";

@Injectable()
export class DrizzleCustomerSelfRegistrationRepository
  implements ICustomerSelfRegistrationRepository
{
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  async create(
    data: CreateCustomerSelfRegistrationData,
  ): Promise<CustomerSelfRegistrationEntity> {
    const [row] = await this.db
      .insert(schema.customerSelfRegistrations)
      .values({
        orgId: data.orgId,
        email: data.email,
        serviceTypeId: data.serviceTypeId,
        anamnesisResponseId: data.anamnesisResponseId,
        createdBy: data.createdBy,
      })
      .returning();

    if (!row) throw new Error("Failed to create customer self registration");
    return toCustomerSelfRegistrationDomain(row);
  }

  async findPendingByEmail(
    orgId: string,
    email: string,
  ): Promise<CustomerSelfRegistrationEntity | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;

    const [row] = await this.db
      .select()
      .from(schema.customerSelfRegistrations)
      .where(
        and(
          eq(schema.customerSelfRegistrations.orgId, orgId),
          eq(schema.customerSelfRegistrations.status, "pending"),
          sql`lower(btrim(${schema.customerSelfRegistrations.email})) = ${normalized}`,
        ),
      )
      .limit(1);

    return row ? toCustomerSelfRegistrationDomain(row) : null;
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(schema.customerSelfRegistrations)
      .where(eq(schema.customerSelfRegistrations.id, id));
  }

  async findByToken(
    token: string,
  ): Promise<CustomerSelfRegistrationWithContext | null> {
    const [row] = await this.admin
      .select({
        registration: schema.customerSelfRegistrations,
        organizationName: schema.organizations.name,
        serviceTypeName: schema.serviceTypes.name,
        anamnesisToken: schema.anamnesisResponses.token,
      })
      .from(schema.customerSelfRegistrations)
      .innerJoin(
        schema.organizations,
        eq(schema.organizations.id, schema.customerSelfRegistrations.orgId),
      )
      .leftJoin(
        schema.serviceTypes,
        eq(
          schema.serviceTypes.id,
          schema.customerSelfRegistrations.serviceTypeId,
        ),
      )
      .leftJoin(
        schema.anamnesisResponses,
        eq(
          schema.anamnesisResponses.id,
          schema.customerSelfRegistrations.anamnesisResponseId,
        ),
      )
      .where(eq(schema.customerSelfRegistrations.token, token))
      .limit(1);

    if (!row) return null;

    const entity = toCustomerSelfRegistrationDomain(row.registration);
    return Object.assign(entity, {
      organizationName: row.organizationName,
      serviceTypeName: row.serviceTypeName ?? null,
      anamnesisToken: row.anamnesisToken ?? null,
    });
  }

  async linkCustomer(id: string, customerId: string): Promise<void> {
    await this.admin
      .update(schema.customerSelfRegistrations)
      .set({ customerId })
      .where(
        and(
          eq(schema.customerSelfRegistrations.id, id),
          eq(schema.customerSelfRegistrations.status, "pending"),
        ),
      );
  }

  async markSubmitted(id: string, customerId: string): Promise<boolean> {
    const updated = await this.admin
      .update(schema.customerSelfRegistrations)
      .set({
        status: "submitted",
        submittedAt: new Date(),
        customerId,
      })
      .where(
        and(
          eq(schema.customerSelfRegistrations.id, id),
          eq(schema.customerSelfRegistrations.status, "pending"),
        ),
      )
      .returning({ id: schema.customerSelfRegistrations.id });

    return updated.length > 0;
  }
}
