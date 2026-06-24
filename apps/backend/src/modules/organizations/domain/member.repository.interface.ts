import type { OrgRole } from "./org.entity";
import type { MemberEntity } from "./member.entity";

export const MEMBER_REPOSITORY = Symbol("MEMBER_REPOSITORY");

export interface UpsertMembershipData {
  orgId: string;
  userId: string;
  role: OrgRole;
  /** Módulos liberados ao funcionário na criação (default restrito). */
  permissions?: string[];
}

export interface IMemberRepository {
  findAllByOrg(orgId: string): Promise<MemberEntity[]>;
  /** Cria a associação (ou reativa/atualiza papel se já existir). Bypassa RLS. */
  upsert(data: UpsertMembershipData): Promise<void>;
  findByMemberId(memberId: string, orgId: string): Promise<MemberEntity | null>;
  /** Resolve a associação a partir do auth id (Supabase) do usuário logado. */
  findByAuthId(orgId: string, authId: string): Promise<MemberEntity | null>;
  updateRole(memberId: string, role: OrgRole): Promise<MemberEntity>;
  /** Define os módulos liberados ao funcionário (owner configura). */
  updatePermissions(memberId: string, permissions: string[]): Promise<MemberEntity>;
  setEnabled(memberId: string, enabled: boolean): Promise<MemberEntity>;
  /** Owners ativos da org. */
  countActiveOwners(orgId: string): Promise<number>;
  remove(memberId: string): Promise<void>;
}
