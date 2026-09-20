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
import { FeeSource, MAX_INSTALLMENTS } from "../../domain/fee-calculator";
import { resolveActor } from "./resolve-actor";

const FEE_ELIGIBLE_METHODS: readonly PaymentMethod[] = [
  "credit_card",
  "debit_card",
];

/**
 * Faixas de parcelas por método: débito só tem a faixa 1 (à vista); crédito
 * tem as faixas 1 até MAX_INSTALLMENTS. Gera o produto cartesiano
 * método × faixa nas linhas de resposta.
 */
function installmentTiersFor(method: PaymentMethod): readonly number[] {
  if (method !== "credit_card") {
    return [1];
  }
  return Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1);
}

export interface GetMemberPaymentFeesInput {
  orgId: string;
  authId: string;
}

export interface MemberPaymentFeeRow {
  userId: string;
  name: string;
  role: string;
  paymentMethod: PaymentMethod;
  installments: number;
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
      memberFees.map((fee) => [
        `${fee.userId}:${fee.paymentMethod}:${fee.installments}`,
        fee,
      ]),
    );
    const orgFeeByKey = new Map<string, PaymentFeeEntity>(
      orgFees.map((fee) => [
        `${fee.paymentMethod}:${fee.installments}`,
        fee,
      ]),
    );

    const scopedMembers = isOwner
      ? members
      : members.filter((member) => member.userId === currentUserId);

    // Produto cartesiano método × faixa: débito só tem a faixa 1; crédito tem
    // 1..MAX_INSTALLMENTS. Isso faz a resposta crescer de ~2 para ~13
    // linhas/membro (aceitável em JSON) — NÃO "otimizar" removendo faixas.
    return scopedMembers
      .filter((member) => member.enabled)
      .flatMap((member) =>
        FEE_ELIGIBLE_METHODS.flatMap((paymentMethod) =>
          installmentTiersFor(paymentMethod).map(
            (installments): MemberPaymentFeeRow => {
              const memberFee = memberFeeByKey.get(
                `${member.userId}:${paymentMethod}:${installments}`,
              );
              // Fallback é POR FAIXA: 6x sem override do membro cai na taxa
              // de 6x da org, nunca na de 1x (sem fallback entre faixas).
              const orgFee = orgFeeByKey.get(`${paymentMethod}:${installments}`);

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
                installments,
                percent,
                fixedCents,
                source,
                configured,
              };
            },
          ),
        ),
      );
  }
}
