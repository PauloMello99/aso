import type { OrgEntity } from "./org.entity";

export const ORGANIZATION_REPOSITORY = Symbol("ORGANIZATION_REPOSITORY");

export interface IOrganizationRepository {
  // Read
  findAllByAuthId(authId: string): Promise<OrgEntity[]>;
  findByIdAndAuthId(orgId: string, authId: string): Promise<OrgEntity | null>;
  isOwner(orgId: string, authId: string): Promise<boolean>;

  // Mutations
  create(name: string, slug: string, creatorAuthId: string): Promise<OrgEntity>;
  update(orgId: string, data: { name?: string }): Promise<OrgEntity>;
  delete(orgId: string): Promise<void>;
}
