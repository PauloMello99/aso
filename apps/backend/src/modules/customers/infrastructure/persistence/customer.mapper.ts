import type { Customer as CustomerRow } from "../../../../database/schema/studio/customers";
import { CustomerEntity } from "../../domain/customer.entity";

export class CustomerMapper {
  static toDomain(row: CustomerRow): CustomerEntity {
    return CustomerEntity.create({
      id: row.id,
      orgId: row.orgId,
      userId: row.userId ?? null,
      originId: row.originId ?? null,
      createdBy: row.createdBy ?? null,
      name: row.name,
      email: row.email ?? null,
      phone: row.phone ?? null,
      birthDate: row.birthDate ?? null,
      gender: row.gender ?? null,
      address: row.address ?? null,
      addressLine2: row.addressLine2 ?? null,
      city: row.city ?? null,
      state: row.state ?? null,
      postalCode: row.postalCode ?? null,
      country: row.country ?? null,
      notes: row.notes ?? null,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
