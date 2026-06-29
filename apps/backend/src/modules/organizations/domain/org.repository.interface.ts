import type { OrgEntity } from "./org.entity";

export const ORGANIZATION_REPOSITORY = Symbol("ORGANIZATION_REPOSITORY");

export interface IOrganizationRepository {
  // Read
  findAllByAuthId(authId: string): Promise<OrgEntity[]>;
  /**
   * Org visível ao ator: membro (role real) OU super_admin (role sintetizado
   * "owner"). Null se não-membro e não super_admin.
   */
  findByIdAndAuthId(orgId: string, authId: string): Promise<OrgEntity | null>;
  /** Idem por slug — usado no deep-link do super_admin para uma org alheia. */
  findBySlugAndAuthId(slug: string, authId: string): Promise<OrgEntity | null>;
  /** True se o ator pode agir como owner: owner-membro OU super_admin. */
  isOwner(orgId: string, authId: string): Promise<boolean>;

  // Mutations
  create(name: string, slug: string, creatorAuthId: string): Promise<OrgEntity>;
  update(orgId: string, data: { name?: string }): Promise<OrgEntity>;
  delete(orgId: string): Promise<void>;
}
