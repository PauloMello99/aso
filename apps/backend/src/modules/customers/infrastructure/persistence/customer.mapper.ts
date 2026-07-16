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
      email: row.email,
      phone: row.phone ?? null,
      birthDate: row.birthDate,
      gender: row.gender ?? null,
      address: row.address,
      number: row.number,
      addressLine2: row.addressLine2 ?? null,
      city: row.city,
      state: row.state,
      postalCode: row.postalCode ?? null,
      country: row.country ?? null,
      notes: row.notes ?? null,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
