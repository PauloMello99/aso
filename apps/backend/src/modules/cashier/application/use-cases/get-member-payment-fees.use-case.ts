import { Inject, Injectable } from "@nestjs/common";
import { MemberPaymentFeeEntity } from "../../domain/member-payment-fee.entity";
import {
  IMemberPaymentFeeRepository,
  MEMBER_PAYMENT_FEE_REPOSITORY,
} from "../../domain/member-payment-fee.repository.interface";
import { PaymentFeeEntity } from "../../domain/payment-fee.entity";
import {
  IPaymentFeeRepository,
  PAYMENT_FEE_REPOSITORY,
} from "../../domain/payment-fee.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { PaymentMethod } from "../../domain/transaction.entity";
import { FeeSource } from "../../domain/fee-calculator";
import { resolveActor } from "./resolve-actor";

const FEE_ELIGIBLE_METHODS: readonly PaymentMethod[] = [
  "credit_card",
  "debit_card",
];

export interface GetMemberPaymentFeesInput {
  orgId: string;
  authId: string;
}

export interface MemberPaymentFeeRow {
  userId: string;
  name: string;
  role: string;
  paymentMethod: PaymentMethod;
  percent: string;
  fixedCents: number;
  source: FeeSource;
  configured: boolean;
}

@Injectable()
export class GetMemberPaymentFeesUseCase {
  constructor(
    @Inject(MEMBER_PAYMENT_FEE_REPOSITORY)
    private readonly memberFeeRepo: IMemberPaymentFeeRepository,
    @Inject(PAYMENT_FEE_REPOSITORY)
    private readonly orgFeeRepo: IPaymentFeeRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
  ) {}

  async execute(
    input: GetMemberPaymentFeesInput,
  ): Promise<MemberPaymentFeeRow[]> {
    const { userId: currentUserId, isOwner } = await resolveActor(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    const [members, memberFees, orgFees] = await Promise.all([
      this.memberRepo.findAllByOrg(input.orgId),
      this.memberFeeRepo.findActiveByOrg(input.orgId),
      this.orgFeeRepo.findByOrg(input.orgId),
    ]);

    const memberFeeByKey = new Map<string, MemberPaymentFeeEntity>(
      memberFees.map((fee) => [`${fee.userId}:${fee.paymentMethod}`, fee]),
    );
    const orgFeeByMethod = new Map<PaymentMethod, PaymentFeeEntity>(
      orgFees.map((fee) => [fee.paymentMethod, fee]),
    );

    const scopedMembers = isOwner
      ? members
      : members.filter((member) => member.userId === currentUserId);

    return scopedMembers
      .filter((member) => member.enabled)
      .flatMap((member) =>
        FEE_ELIGIBLE_METHODS.map((paymentMethod): MemberPaymentFeeRow => {
          const memberFee = memberFeeByKey.get(
            `${member.userId}:${paymentMethod}`,
          );
          const orgFee = orgFeeByMethod.get(paymentMethod);

          let percent = "0.00";
          let fixedCents = 0;
          let source: FeeSource = "none";
          let configured = false;

          if (memberFee) {
            percent = memberFee.percent;
            fixedCents = memberFee.fixedCents;
            source = "member";
            configured = true;
          } else if (orgFee) {
            percent = orgFee.percent;
            fixedCents = orgFee.fixedCents;
            source = "org";
          }

          return {
            userId: member.userId,
            name: member.userName,
            role: member.role,
            paymentMethod,
            percent,
            fixedCents,
            source,
            configured,
          };
        }),
      );
  }
}
