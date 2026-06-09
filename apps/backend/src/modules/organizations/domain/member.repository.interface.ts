import type { OrgRole } from "./org.entity";
import type { MemberEntity } from "./member.entity";

export const MEMBER_REPOSITORY = Symbol("MEMBER_REPOSITORY");

export interface IMemberRepository {
  findAllByOrg(orgId: string): Promise<MemberEntity[]>;
  findByMemberId(memberId: string, orgId: string): Promise<MemberEntity | null>;
  updateRole(memberId: string, role: OrgRole): Promise<MemberEntity>;
  remove(memberId: string): Promise<void>;
}
