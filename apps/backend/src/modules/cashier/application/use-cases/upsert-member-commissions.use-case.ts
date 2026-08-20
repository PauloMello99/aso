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
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../../organizations/domain/org.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";
import { CommissionMemberNotFoundException } from "../../domain/exceptions/commission-member-not-found.exception";

export interface UpsertMemberCommissionItem {
  userId: string;
  percent: string;
  mode: CommissionMode;
}

export interface UpsertMemberCommissionsInput {
  orgId: string;
  authId: string;
  commissions: UpsertMemberCommissionItem[];
}

@Injectable()
export class UpsertMemberCommissionsUseCase {
  constructor(
    @Inject(MEMBER_COMMISSION_REPOSITORY)
    private readonly commissionRepo: IMemberCommissionRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
  ) {}

  async execute(
    input: UpsertMemberCommissionsInput,
  ): Promise<MemberCommissionEntity[]> {
    const isOwner = await this.orgRepo.isOwner(input.orgId, input.authId);
    if (!isOwner) {
      throw new CashierForbiddenException(
        "Only organization owners can configure commissions",
      );
    }

    const currentOwner = await this.memberRepo.findByAuthId(
      input.orgId,
      input.authId,
    );
    const createdBy = currentOwner?.userId ?? null;

    const members = await this.memberRepo.findAllByOrg(input.orgId);
    const memberIds = new Set(
      members.filter((member) => member.enabled).map((member) => member.userId),
    );

    for (const item of input.commissions) {
      if (!memberIds.has(item.userId)) {
        throw new CommissionMemberNotFoundException(item.userId);
      }
    }

    for (const item of input.commissions) {
      const active = await this.commissionRepo.findActiveByOrgAndUser(
        input.orgId,
        item.userId,
      );

      const normalizedPercent = item.percent.trim();
      const unchanged =
        active !== null &&
        Number.parseFloat(active.percent) ===
          Number.parseFloat(normalizedPercent) &&
        active.mode === item.mode;

      if (unchanged) continue;

      await this.commissionRepo.supersede({
        orgId: input.orgId,
        userId: item.userId,
        percent: normalizedPercent,
        mode: item.mode,
        createdBy,
      });
    }

    return this.commissionRepo.findActiveByOrg(input.orgId);
  }
}
