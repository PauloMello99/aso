import { Inject, Injectable } from "@nestjs/common";
import { MemberPaymentFeeEntity } from "../../domain/member-payment-fee.entity";
import {
  IMemberPaymentFeeRepository,
  MEMBER_PAYMENT_FEE_REPOSITORY,
} from "../../domain/member-payment-fee.repository.interface";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../../organizations/domain/org.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { PaymentMethod } from "../../domain/transaction.entity";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";
import { FeeMemberNotFoundException } from "../../domain/exceptions/fee-member-not-found.exception";
import { AuditService } from "../../../audit/audit.service";

export interface UpsertMemberPaymentFeeItem {
  userId: string;
  paymentMethod: PaymentMethod;
  percent: string;
  fixedCents: number;
}

export interface MemberPaymentFeeDeactivationItem {
  userId: string;
  paymentMethod: PaymentMethod;
}

export interface UpsertMemberPaymentFeesInput {
  orgId: string;
  authId: string;
  fees: UpsertMemberPaymentFeeItem[];
  deactivations?: MemberPaymentFeeDeactivationItem[];
}

@Injectable()
export class UpsertMemberPaymentFeesUseCase {
  constructor(
    @Inject(MEMBER_PAYMENT_FEE_REPOSITORY)
    private readonly memberFeeRepo: IMemberPaymentFeeRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    input: UpsertMemberPaymentFeesInput,
  ): Promise<MemberPaymentFeeEntity[]> {
    const isOwner = await this.orgRepo.isOwner(input.orgId, input.authId);
    if (!isOwner) {
      throw new CashierForbiddenException(
        "Only organization owners can configure payment fees",
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

    for (const item of input.fees) {
      if (!memberIds.has(item.userId)) {
        throw new FeeMemberNotFoundException(item.userId);
      }
    }

    for (const item of input.deactivations ?? []) {
      if (!memberIds.has(item.userId)) {
        throw new FeeMemberNotFoundException(item.userId);
      }
    }

    const changes: Array<{
      userId: string;
      paymentMethod: PaymentMethod;
      previousPercent: string | null;
      previousFixedCents: number | null;
      percent: string | null;
      fixedCents: number | null;
    }> = [];

    for (const item of input.fees) {
      const active = await this.memberFeeRepo.findActiveByOrgUserAndMethod(
        input.orgId,
        item.userId,
        item.paymentMethod,
      );

      const normalizedPercent = item.percent.trim();
      const unchanged =
        active !== null &&
        Number.parseFloat(active.percent) ===
          Number.parseFloat(normalizedPercent) &&
        active.fixedCents === item.fixedCents;

      if (unchanged) continue;

      await this.memberFeeRepo.supersede({
        orgId: input.orgId,
        userId: item.userId,
        paymentMethod: item.paymentMethod,
        percent: normalizedPercent,
        fixedCents: item.fixedCents,
        createdBy,
      });

      changes.push({
        userId: item.userId,
        paymentMethod: item.paymentMethod,
        previousPercent: active?.percent ?? null,
        previousFixedCents: active?.fixedCents ?? null,
        percent: normalizedPercent,
        fixedCents: item.fixedCents,
      });
    }

    for (const item of input.deactivations ?? []) {
      const active = await this.memberFeeRepo.findActiveByOrgUserAndMethod(
        input.orgId,
        item.userId,
        item.paymentMethod,
      );

      if (active === null) continue;

      await this.memberFeeRepo.deactivate(
        input.orgId,
        item.userId,
        item.paymentMethod,
      );

      changes.push({
        userId: item.userId,
        paymentMethod: item.paymentMethod,
        previousPercent: active.percent,
        previousFixedCents: active.fixedCents,
        percent: null,
        fixedCents: null,
      });
    }

    if (changes.length > 0) {
      await this.auditService.logByAuthId(input.authId, {
        orgId: input.orgId,
        action: "cashier_fees_updated",
        entityType: "member_payment_fees",
        entityId: input.orgId,
        metadata: { scope: "member", changes },
      });
    }

    return this.memberFeeRepo.findActiveByOrg(input.orgId);
  }
}
