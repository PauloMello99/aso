import { Inject, Injectable } from "@nestjs/common";
import { asc, eq, and } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { IOrganizationRepository } from "../../domain/org.repository.interface";
import type { OrgEntity } from "../../domain/org.entity";
import { OrgMapper } from "./org.mapper";

const ORG_SELECT = {
  id: schema.organizations.id,
  name: schema.organizations.name,
  slug: schema.organizations.slug,
  logoUrl: schema.organizations.logoUrl,
  role: schema.orgMemberships.role,
  createdAt: schema.organizations.createdAt,
  updatedAt: schema.organizations.updatedAt,
} as const;

@Injectable()
export class DrizzleOrgRepository implements IOrganizationRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    // create() inserts the first owner membership before one exists, which the
    // org_memberships_insert RLS policy would block — so it bypasses RLS.
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  async findAllByAuthId(authId: string): Promise<OrgEntity[]> {
    const rows = await this.db
      .select(ORG_SELECT)
      .from(schema.organizations)
      .innerJoin(
        schema.orgMemberships,
        eq(schema.orgMemberships.orgId, schema.organizations.id),
      )
      .innerJoin(schema.users, eq(schema.users.id, schema.orgMemberships.userId))
      .where(eq(schema.users.authId, authId))
      .orderBy(asc(schema.organizations.name));

    return rows.map(OrgMapper.toDomain);
  }

  async findByIdAndAuthId(orgId: string, authId: string): Promise<OrgEntity | null> {
    const [row] = await this.db
      .select(ORG_SELECT)
      .from(schema.organizations)
      .innerJoin(
        schema.orgMemberships,
        eq(schema.orgMemberships.orgId, schema.organizations.id),
      )
      .innerJoin(schema.users, eq(schema.users.id, schema.orgMemberships.userId))
      .where(and(eq(schema.organizations.id, orgId), eq(schema.users.authId, authId)))
      .limit(1);

    return row ? OrgMapper.toDomain(row) : null;
  }

  async isOwner(orgId: string, authId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ role: schema.orgMemberships.role })
      .from(schema.orgMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.orgMemberships.userId))
      .where(
        and(
          eq(schema.orgMemberships.orgId, orgId),
          eq(schema.users.authId, authId),
          eq(schema.orgMemberships.role, "owner"),
        ),
      )
      .limit(1);

    return !!row;
  }

  async create(name: string, slug: string, creatorAuthId: string): Promise<OrgEntity> {
    return this.admin.transaction(async (tx) => {
      // Find the creator's user record
      const [user] = await tx
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.authId, creatorAuthId))
        .limit(1);

      if (!user) throw new Error("User not found");

      // Create the org
      const insertedOrgs = await tx
        .insert(schema.organizations)
        .values({ name, slug })
        .returning();
      const org = insertedOrgs[0];
      if (!org) throw new Error("Failed to create organization");

      // Add creator as owner
      await tx.insert(schema.orgMemberships).values({
        orgId: org.id,
        userId: user.id,
        role: "owner",
      });

      // Seed default lookups (origens de cliente + categorias de transação).
      await tx
        .insert(schema.customerOrigins)
        .values(
          ["Indicação", "Rede social do profissional", "Rede social do estúdio"].map(
            (name) => ({ orgId: org.id, name }),
          ),
        )
        .onConflictDoNothing();
      await tx
        .insert(schema.transactionCategories)
        .values(
          ["Serviço", "Funcionário", "Material", "Conta", "Reforma", "Transferência", "Outros"].map(
            (name) => ({ orgId: org.id, name }),
          ),
        )
        .onConflictDoNothing();

      return OrgMapper.toDomain({ ...org, role: "owner" as const });
    });
  }

  async update(orgId: string, data: { name?: string }): Promise<OrgEntity> {
    await this.db
      .update(schema.organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.organizations.id, orgId));

    // Re-fetch with role (join through owner membership)
    const [row] = await this.db
      .select(ORG_SELECT)
      .from(schema.organizations)
      .innerJoin(
        schema.orgMemberships,
        eq(schema.orgMemberships.orgId, schema.organizations.id),
      )
      .innerJoin(schema.users, eq(schema.users.id, schema.orgMemberships.userId))
      .where(
        and(
          eq(schema.organizations.id, orgId),
          eq(schema.orgMemberships.role, "owner"),
        ),
      )
      .limit(1);

    if (!row) throw new Error("Organization not found after update");
    return OrgMapper.toDomain(row);
  }

  async delete(orgId: string): Promise<void> {
    await this.db
      .delete(schema.organizations)
      .where(eq(schema.organizations.id, orgId));
  }
}
