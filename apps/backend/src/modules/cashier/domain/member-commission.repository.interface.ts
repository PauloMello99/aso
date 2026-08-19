import type {
  CommissionMode,
  MemberCommissionEntity,
} from "./member-commission.entity";

export const MEMBER_COMMISSION_REPOSITORY = Symbol(
  "MEMBER_COMMISSION_REPOSITORY",
);

export interface UpsertMemberCommissionData {
  orgId: string;
  userId: string;
  percent: string;
  mode: CommissionMode;
  createdBy: string | null;
}

export interface IMemberCommissionRepository {
  findActiveByOrg(orgId: string): Promise<MemberCommissionEntity[]>;
  findActiveByOrgAndUser(
    orgId: string,
    userId: string,
  ): Promise<MemberCommissionEntity | null>;
  findHistoryByOrgAndUser(
    orgId: string,
    userId: string,
  ): Promise<MemberCommissionEntity[]>;
  supersede(data: UpsertMemberCommissionData): Promise<MemberCommissionEntity>;
}
