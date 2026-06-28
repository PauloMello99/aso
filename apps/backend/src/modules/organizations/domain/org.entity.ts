export type OrgRole = "owner" | "employee";

export interface OrgEntityProps {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: OrgRole;
  /** Módulos liberados (só relevante p/ employee; owner = acesso total). */
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class OrgEntity {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly logoUrl: string | null;
  readonly role: OrgRole;
  readonly permissions: string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: OrgEntityProps) {
    this.id = props.id;
    this.name = props.name;
    this.slug = props.slug;
    this.logoUrl = props.logoUrl;
    this.role = props.role;
    this.permissions = props.permissions ?? [];
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: OrgEntityProps): OrgEntity {
    return new OrgEntity(props);
  }
}
