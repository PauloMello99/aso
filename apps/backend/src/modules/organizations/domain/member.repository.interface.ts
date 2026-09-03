import type { OrgRole } from "./org.entity";
import type { MemberClassification, MemberEntity } from "./member.entity";

export const MEMBER_REPOSITORY = Symbol("MEMBER_REPOSITORY");

export interface UpsertMembershipData {
  orgId: string;
  userId: string;
  role: OrgRole;
  permissions?: string[];
}

export interface IMemberRepository {
  findAllByOrg(orgId: string): Promise<MemberEntity[]>;
  upsert(data: UpsertMembershipData): Promise<void>;
  findByMemberId(memberId: string, orgId: string): Promise<MemberEntity | null>;
  findByAuthId(orgId: string, authId: string): Promise<MemberEntity | null>;
  updateRole(memberId: string, role: OrgRole): Promise<MemberEntity>;
  updatePermissions(memberId: string, permissions: string[]): Promise<MemberEntity>;
  updateClassification(
    memberId: string,
    classification: MemberClassification | null,
  ): Promise<MemberEntity>;
  setEnabled(memberId: string, enabled: boolean): Promise<MemberEntity>;
  countActiveOwners(orgId: string): Promise<number>;
  countOwnedOrgs(userId: string): Promise<number>;
  removeAllByUserId(userId: string): Promise<void>;
  transferOwnership(
    orgId: string,
    newOwnerMemberId: string,
    currentOwnerMemberId: string,
    demotedPermissions: string[],
  ): Promise<void>;
  remove(memberId: string): Promise<void>;
}
