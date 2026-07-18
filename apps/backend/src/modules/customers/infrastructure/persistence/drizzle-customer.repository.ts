import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, ilike, lte, ne, or, sql } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  CreateCustomerData,
  CustomerEntity,
  UpdateCustomerData,
} from "../../domain/customer.entity";
import {
  ICustomerRepository,
  ListCustomersFilter,
} from "../../domain/customer.repository.interface";
import { CustomerEmailAlreadyExistsException } from "../../domain/exceptions/customer-email-already-exists.exception";
import { CustomerMapper } from "./customer.mapper";

function pgErrorCode(error: unknown): unknown {
  if (typeof error !== "object" || error === null) return undefined;
  if ("code" in error) return (error as { code?: unknown }).code;
  return undefined;
}

function isUniqueViolation(error: unknown): boolean {
  if (pgErrorCode(error) === "23505") return true;
  if (typeof error === "object" && error !== null && "cause" in error) {
    return pgErrorCode((error as { cause?: unknown }).cause) === "23505";
  }
  return false;
}

@Injectable()
export class DrizzleCustomerRepository implements ICustomerRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(id: string, orgId: string): Promise<CustomerEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.customers)
      .where(
        and(eq(schema.customers.id, id), eq(schema.customers.orgId, orgId)),
      )
      .limit(1);
    return row ? CustomerMapper.toDomain(row) : null;
  }

  async findByEmail(
    orgId: string,
    email: string,
    excludeId?: string,
  ): Promise<CustomerEntity | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;

    const conditions = [
      eq(schema.customers.orgId, orgId),
      sql`lower(btrim(${schema.customers.email})) = ${normalized}`,
    ];
    if (excludeId) {
      conditions.push(ne(schema.customers.id, excludeId));
    }

    const [row] = await this.db
      .select()
      .from(schema.customers)
      .where(and(...conditions))
      .limit(1);
    return row ? CustomerMapper.toDomain(row) : null;
  }

  async findAllByOrg(
    orgId: string,
    filter?: ListCustomersFilter,
  ): Promise<CustomerEntity[]> {
    const conditions = [eq(schema.customers.orgId, orgId)];

    if (filter?.status === "active") {
      conditions.push(eq(schema.customers.enabled, true));
    } else if (filter?.status === "inactive") {
      conditions.push(eq(schema.customers.enabled, false));
    } else if (filter?.enabledOnly) {
      conditions.push(eq(schema.customers.enabled, true));
    }

    if (filter?.originId) {
      conditions.push(eq(schema.customers.originId, filter.originId));
    }

    if (filter?.gender) {
      conditions.push(eq(schema.customers.gender, filter.gender));
    }

    if (filter?.from) {
      conditions.push(gte(schema.customers.createdAt, filter.from));
    }
    if (filter?.to) {
      conditions.push(lte(schema.customers.createdAt, filter.to));
    }

    if (filter?.birthMonth) {
      conditions.push(
        sql`EXTRACT(MONTH FROM ${schema.customers.birthDate}) = ${filter.birthMonth}`,
      );
    }

    if (filter?.city) {
      conditions.push(eq(schema.customers.city, filter.city));
    }

    if (filter?.state) {
      conditions.push(eq(schema.customers.state, filter.state));
    }

    if (filter?.search) {
      const term = `%${filter.search}%`;
      const match = or(
        ilike(schema.customers.name, term),
        ilike(schema.customers.email, term),
        ilike(schema.customers.phone, term),
      );
      if (match) conditions.push(match);
    }

    const rows = await this.db
      .select()
      .from(schema.customers)
      .where(and(...conditions))
      .orderBy(schema.customers.name);

    return rows.map(CustomerMapper.toDomain);
  }

  async create(data: CreateCustomerData): Promise<CustomerEntity> {
    try {
      const [row] = await this.db
        .insert(schema.customers)
        .values({
          orgId: data.orgId,
          createdBy: data.createdBy ?? null,
          originId: data.originId ?? null,
          name: data.name,
          email: data.email,
          phone: data.phone ?? null,
          birthDate: data.birthDate,
          gender: data.gender ?? null,
          address: data.address,
          number: data.number,
          addressLine2: data.addressLine2 ?? null,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode ?? null,
          country: data.country ?? null,
          notes: data.notes ?? null,
        })
        .returning();
      return CustomerMapper.toDomain(row!);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new CustomerEmailAlreadyExistsException(data.email ?? "");
      }
      throw error;
    }
  }

  async update(id: string, data: UpdateCustomerData): Promise<CustomerEntity> {
    try {
      const [row] = await this.db
        .update(schema.customers)
        .set({
          ...(data.originId !== undefined && { originId: data.originId }),
          ...(data.name !== undefined && { name: data.name }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.birthDate !== undefined && { birthDate: data.birthDate }),
          ...(data.gender !== undefined && { gender: data.gender }),
          ...(data.address !== undefined && { address: data.address }),
          ...(data.number !== undefined && { number: data.number }),
          ...(data.addressLine2 !== undefined && {
            addressLine2: data.addressLine2,
          }),
          ...(data.city !== undefined && { city: data.city }),
          ...(data.state !== undefined && { state: data.state }),
          ...(data.postalCode !== undefined && {
            postalCode: data.postalCode,
          }),
          ...(data.country !== undefined && { country: data.country }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.enabled !== undefined && { enabled: data.enabled }),
          updatedAt: new Date(),
        })
        .where(eq(schema.customers.id, id))
        .returning();
      return CustomerMapper.toDomain(row!);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new CustomerEmailAlreadyExistsException(data.email ?? "");
      }
      throw error;
    }
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.db
      .delete(schema.customers)
      .where(
        and(eq(schema.customers.id, id), eq(schema.customers.orgId, orgId)),
      );
  }
}
