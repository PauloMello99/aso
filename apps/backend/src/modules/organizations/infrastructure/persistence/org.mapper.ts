import { OrgEntity, type OrgRole } from "../../domain/org.entity";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: string;
  permissions?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export class OrgMapper {
  static toDomain(row: OrgRow): OrgEntity {
    return OrgEntity.create({
      id: row.id,
      name: row.name,
      slug: row.slug,
      logoUrl: row.logoUrl,
      role: row.role as OrgRole,
      permissions: row.permissions ?? [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
