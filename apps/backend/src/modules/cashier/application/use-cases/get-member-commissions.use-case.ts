import { Inject, Injectable } from "@nestjs/common";
import {
  CommissionMode,
  MemberCommissionEntity,
} from "../../domain/member-commission.entity";
import {
  IMemberCommissionRepository,
  MEMBER_COMMISSION_REPOSITORY,
} from "../../domain/member-commission.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { resolveActor } from "./resolve-actor";

export interface GetMemberCommissionsInput {
  orgId: string;
  authId: string;
}

export interface MemberCommissionRow {
  userId: string;
  name: string;
  role: string;
  percent: string;
  mode: CommissionMode | null;
  configured: boolean;
}

@Injectable()
export class GetMemberCommissionsUseCase {
  constructor(
    @Inject(MEMBER_COMMISSION_REPOSITORY)
    private readonly commissionRepo: IMemberCommissionRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
  ) {}

  async execute(
    input: GetMemberCommissionsInput,
  ): Promise<MemberCommissionRow[]> {
    const { userId: currentUserId, isOwner } = await resolveActor(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    const [members, commissions] = await Promise.all([
      this.memberRepo.findAllByOrg(input.orgId),
      this.commissionRepo.findActiveByOrg(input.orgId),
    ]);

    const commissionByUserId = new Map<string, MemberCommissionEntity>(
      commissions.map((commission) => [commission.userId, commission]),
    );

    const scopedMembers = isOwner
      ? members
      : members.filter((member) => member.userId === currentUserId);

    return scopedMembers
      .filter((member) => member.enabled)
      .map((member) => {
        const commission = commissionByUserId.get(member.userId);
        return {
          userId: member.userId,
          name: member.userName,
          role: member.role,
          percent: commission?.percent ?? "0.00",
          mode: commission?.mode ?? null,
          configured: commission !== undefined,
        };
      });
  }
}
