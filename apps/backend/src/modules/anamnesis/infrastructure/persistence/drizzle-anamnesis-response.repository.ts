import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, notExists } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { AnamnesisResponseEntity } from "../../domain/anamnesis-response.entity";
import type {
  CreateAnamnesisResponseData,
  IAnamnesisResponseRepository,
  AnamnesisResponseWithCustomerName,
  MarkSubmittedData,
  AnamnesisResponseListItem,
  AnamnesisResponseDetail,
  ListAnamnesisResponsesFilters,
} from "../../domain/anamnesis-response.repository.interface";
import { AnamnesisResponseMapper } from "./anamnesis-response.mapper";

@Injectable()
export class DrizzleAnamnesisResponseRepository
  implements IAnamnesisResponseRepository
{
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  async create(
    data: CreateAnamnesisResponseData,
  ): Promise<AnamnesisResponseEntity> {
    const [row] = await this.db
      .insert(schema.anamnesisResponses)
      .values({
        orgId: data.orgId,
        formVersionId: data.formVersionId,
        serviceTypeId: data.serviceTypeId,
        customerId: data.customerId,
        questionsSnapshot: data.questionsSnapshot,
        createdBy: data.createdBy,
      })
      .returning();

    if (!row) throw new Error("Failed to create anamnesis response");
    return AnamnesisResponseMapper.toDomain(row);
  }

  async deletePendingFor(
    customerId: string,
    serviceTypeId: string,
    orgId: string,
  ): Promise<void> {
    await this.admin
      .delete(schema.anamnesisResponses)
      .where(
        and(
          eq(schema.anamnesisResponses.customerId, customerId),
          eq(schema.anamnesisResponses.serviceTypeId, serviceTypeId),
          eq(schema.anamnesisResponses.orgId, orgId),
          eq(schema.anamnesisResponses.status, "pending"),
        ),
      );
  }

  async delete(id: string): Promise<void> {
    await this.admin
      .delete(schema.anamnesisResponses)
      .where(eq(schema.anamnesisResponses.id, id));
  }

  async findByToken(
    token: string,
  ): Promise<AnamnesisResponseWithCustomerName | null> {
    const [row] = await this.admin
      .select({
        response: schema.anamnesisResponses,
        customerName: schema.customers.name,
        customerEmail: schema.customers.email,
        organizationName: schema.organizations.name,
      })
      .from(schema.anamnesisResponses)
      .leftJoin(
        schema.customers,
        eq(schema.customers.id, schema.anamnesisResponses.customerId),
      )
      .innerJoin(
        schema.organizations,
        eq(schema.organizations.id, schema.anamnesisResponses.orgId),
      )
      .where(eq(schema.anamnesisResponses.token, token))
      .limit(1);

    if (!row) return null;

    const entity = AnamnesisResponseMapper.toDomain(row.response);
    return Object.assign(entity, {
      customerName: row.customerName ?? "",
      customerEmail: row.customerEmail ?? "",
      organizationName: row.organizationName,
    });
  }

  async markSubmitted(
    id: string,
    data: MarkSubmittedData,
  ): Promise<boolean> {
    const updated = await this.admin
      .update(schema.anamnesisResponses)
      .set({
        status: "submitted",
        answers: data.answers,
        signerFullName: data.signerFullName,
        signerCpf: data.signerCpf,
        signatureStoragePath: data.signatureStoragePath,
        pdfStoragePath: data.pdfStoragePath,
        pdfHashSha256: data.pdfHashSha256,
        requestIp: data.requestIp,
        requestUserAgent: data.requestUserAgent,
        consentTextSnapshot: data.consentTextSnapshot,
        consentVersion: data.consentVersion,
        consentAcceptedAt: data.consentAcceptedAt,
        submittedAt: new Date(),
      })
      .where(
        and(
          eq(schema.anamnesisResponses.id, id),
          eq(schema.anamnesisResponses.status, "pending"),
        ),
      )
      .returning({ id: schema.anamnesisResponses.id });

    return updated.length > 0;
  }

  async findById(
    id: string,
    orgId: string,
  ): Promise<AnamnesisResponseEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.anamnesisResponses)
      .where(
        and(
          eq(schema.anamnesisResponses.id, id),
          eq(schema.anamnesisResponses.orgId, orgId),
        ),
      )
      .limit(1);

    return row ? AnamnesisResponseMapper.toDomain(row) : null;
  }

  async findLinkable(
    customerId: string,
    serviceTypeId: string,
    orgId: string,
  ): Promise<AnamnesisResponseEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.anamnesisResponses)
      .where(
        and(
          eq(schema.anamnesisResponses.customerId, customerId),
          eq(schema.anamnesisResponses.serviceTypeId, serviceTypeId),
          eq(schema.anamnesisResponses.orgId, orgId),
          eq(schema.anamnesisResponses.status, "submitted"),
          notExists(
            this.db
              .select({ one: schema.services.id })
              .from(schema.services)
              .where(
                eq(
                  schema.services.anamnesisResponseId,
                  schema.anamnesisResponses.id,
                ),
              ),
          ),
        ),
      );

    return rows.map(AnamnesisResponseMapper.toDomain);
  }

  async findSubmittedForVersion(
    customerId: string,
    formVersionId: string,
    orgId: string,
  ): Promise<AnamnesisResponseEntity | null> {
    // Não reaproveita `findLinkable`: aquele método exclui respostas já
    // vinculadas a um `service` (notExists sobre services.anamnesisResponseId).
    // Aqui o gate é sobre saúde do cliente ("já respondeu a ficha vigente?"),
    // então uma resposta já vinculada a um serviço CONTINUA contando como
    // "já respondida".
    const [row] = await this.db
      .select()
      .from(schema.anamnesisResponses)
      .where(
        and(
          eq(schema.anamnesisResponses.customerId, customerId),
          eq(schema.anamnesisResponses.formVersionId, formVersionId),
          eq(schema.anamnesisResponses.orgId, orgId),
          eq(schema.anamnesisResponses.status, "submitted"),
        ),
      )
      .orderBy(desc(schema.anamnesisResponses.submittedAt))
      .limit(1);

    return row ? AnamnesisResponseMapper.toDomain(row) : null;
  }

  async findPendingFor(
    customerId: string,
    serviceTypeId: string,
    orgId: string,
  ): Promise<AnamnesisResponseEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.anamnesisResponses)
      .where(
        and(
          eq(schema.anamnesisResponses.customerId, customerId),
          eq(schema.anamnesisResponses.serviceTypeId, serviceTypeId),
          eq(schema.anamnesisResponses.orgId, orgId),
          eq(schema.anamnesisResponses.status, "pending"),
        ),
      )
      .orderBy(desc(schema.anamnesisResponses.createdAt))
      .limit(1);

    return row ? AnamnesisResponseMapper.toDomain(row) : null;
  }

  async listByOrg(
    orgId: string,
    filters: ListAnamnesisResponsesFilters,
  ): Promise<AnamnesisResponseListItem[]> {
    const conditions = [eq(schema.anamnesisResponses.orgId, orgId)];
    if (filters.customerId) {
      conditions.push(
        eq(schema.anamnesisResponses.customerId, filters.customerId),
      );
    }
    if (filters.serviceTypeId) {
      conditions.push(
        eq(schema.anamnesisResponses.serviceTypeId, filters.serviceTypeId),
      );
    }
    if (filters.status) {
      conditions.push(eq(schema.anamnesisResponses.status, filters.status));
    }

    const rows = await this.db
      .select({
        response: schema.anamnesisResponses,
        customerName: schema.customers.name,
        serviceTypeName: schema.serviceTypes.name,
        versionNumber: schema.anamnesisFormVersions.versionNumber,
      })
      .from(schema.anamnesisResponses)
      .leftJoin(
        schema.customers,
        eq(schema.customers.id, schema.anamnesisResponses.customerId),
      )
      .leftJoin(
        schema.serviceTypes,
        eq(schema.serviceTypes.id, schema.anamnesisResponses.serviceTypeId),
      )
      .leftJoin(
        schema.anamnesisFormVersions,
        eq(
          schema.anamnesisFormVersions.id,
          schema.anamnesisResponses.formVersionId,
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.anamnesisResponses.createdAt));

    return rows.map((row) =>
      AnamnesisResponseMapper.toListItem({
        response: row.response,
        customerName: row.customerName ?? null,
        serviceTypeName: row.serviceTypeName ?? null,
        versionNumber: row.versionNumber ?? null,
      }),
    );
  }

  async findDetailById(
    id: string,
    orgId: string,
  ): Promise<AnamnesisResponseDetail | null> {
    const [row] = await this.db
      .select({
        response: schema.anamnesisResponses,
        customerName: schema.customers.name,
        serviceTypeName: schema.serviceTypes.name,
        versionNumber: schema.anamnesisFormVersions.versionNumber,
      })
      .from(schema.anamnesisResponses)
      .leftJoin(
        schema.customers,
        eq(schema.customers.id, schema.anamnesisResponses.customerId),
      )
      .leftJoin(
        schema.serviceTypes,
        eq(schema.serviceTypes.id, schema.anamnesisResponses.serviceTypeId),
      )
      .leftJoin(
        schema.anamnesisFormVersions,
        eq(
          schema.anamnesisFormVersions.id,
          schema.anamnesisResponses.formVersionId,
        ),
      )
      .where(
        and(
          eq(schema.anamnesisResponses.id, id),
          eq(schema.anamnesisResponses.orgId, orgId),
        ),
      )
      .limit(1);

    if (!row) return null;

    return AnamnesisResponseMapper.toDetail({
      response: row.response,
      customerName: row.customerName ?? null,
      serviceTypeName: row.serviceTypeName ?? null,
      versionNumber: row.versionNumber ?? null,
    });
  }

  async linkCustomer(
    responseId: string,
    customerId: string,
    orgId: string,
  ): Promise<void> {
    await this.admin
      .update(schema.anamnesisResponses)
      .set({ customerId })
      .where(
        and(
          eq(schema.anamnesisResponses.id, responseId),
          eq(schema.anamnesisResponses.orgId, orgId),
          eq(schema.anamnesisResponses.status, "pending"),
        ),
      );
  }
}
