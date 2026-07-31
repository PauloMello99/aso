import { Inject, Injectable } from "@nestjs/common";
import { and, eq, notExists } from "drizzle-orm";
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
}
