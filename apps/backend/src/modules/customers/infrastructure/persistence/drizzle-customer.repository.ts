import { Inject, Injectable } from "@nestjs/common";
import { and, eq, ilike, or } from "drizzle-orm";
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
import { CustomerMapper } from "./customer.mapper";

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

  async findAllByOrg(
    orgId: string,
    filter?: ListCustomersFilter,
  ): Promise<CustomerEntity[]> {
    const conditions = [eq(schema.customers.orgId, orgId)];

    if (filter?.enabledOnly) {
      conditions.push(eq(schema.customers.enabled, true));
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
    const [row] = await this.db
      .insert(schema.customers)
      .values({
        orgId: data.orgId,
        createdBy: data.createdBy ?? null,
        originId: data.originId ?? null,
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        birthDate: data.birthDate ?? null,
        gender: data.gender ?? null,
        address: data.address ?? null,
        addressLine2: data.addressLine2 ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        postalCode: data.postalCode ?? null,
        country: data.country ?? null,
        notes: data.notes ?? null,
      })
      .returning();
    return CustomerMapper.toDomain(row!);
  }

  async update(id: string, data: UpdateCustomerData): Promise<CustomerEntity> {
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
        ...(data.addressLine2 !== undefined && { addressLine2: data.addressLine2 }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        updatedAt: new Date(),
      })
      .where(eq(schema.customers.id, id))
      .returning();
    return CustomerMapper.toDomain(row!);
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.db
      .delete(schema.customers)
      .where(
        and(eq(schema.customers.id, id), eq(schema.customers.orgId, orgId)),
      );
  }
}
