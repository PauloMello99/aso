import { Inject, Injectable } from "@nestjs/common";
import { MemberPaymentEntity } from "../../domain/member-payment.entity";
import {
  IMemberPaymentRepository,
  MEMBER_PAYMENT_REPOSITORY,
} from "../../domain/member-payment.repository.interface";
import { PaymentMethod } from "../../domain/transaction.entity";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";
import { resolveActor } from "./resolve-actor";

export interface ListMemberPaymentsInput {
  orgId: string;
  authId: string;
  /** Membro cujos pagamentos serao listados — vem da rota, nao do body. */
  targetUserId: string;
}

export interface MemberPaymentView {
  entity: MemberPaymentEntity;
  reversed: boolean;
  /**
   * Metodo REAL da transacao vinculada (join no repositorio, ver
   * MemberPaymentWithMethod) — NAO um campo da propria linha de
   * org_member_payments (ADR-0026 §3). Consumido pelo PayMemberDialog em modo
   * "correct" para pre-preencher o metodo sem recorrer a um default fixo.
   */
  paymentMethod: PaymentMethod;
}

@Injectable()
export class ListMemberPaymentsUseCase {
  constructor(
    @Inject(MEMBER_PAYMENT_REPOSITORY)
    private readonly memberPaymentRepo: IMemberPaymentRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
  ) {}

  async execute(input: ListMemberPaymentsInput): Promise<MemberPaymentView[]> {
    const { userId: currentUserId, isOwner } = await resolveActor(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    if (!isOwner && input.targetUserId !== currentUserId) {
      throw new CashierForbiddenException();
    }

    const [payments, reversedIds] = await Promise.all([
      this.memberPaymentRepo.findAllByOrgAndUser(
        input.orgId,
        input.targetUserId,
      ),
      this.memberPaymentRepo.findReversedIds(input.orgId),
    ]);

    return payments.map(({ entity, paymentMethod }) => ({
      entity,
      reversed: reversedIds.has(entity.id),
      paymentMethod,
    }));
  }
}
