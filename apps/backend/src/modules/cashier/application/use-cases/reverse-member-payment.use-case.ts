import { Inject, Injectable } from "@nestjs/common";
import { MemberPaymentEntity } from "../../domain/member-payment.entity";
import {
  IMemberPaymentRepository,
  MEMBER_PAYMENT_REPOSITORY,
} from "../../domain/member-payment.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";
import { MemberPaymentNotFoundException } from "../../domain/exceptions/member-payment-not-found.exception";
import { MemberPaymentNotReversibleException } from "../../domain/exceptions/member-payment-not-reversible.exception";
import { MemberPaymentAlreadyReversedException } from "../../domain/exceptions/member-payment-already-reversed.exception";
import { resolveActor } from "./resolve-actor";
import { ReverseTransactionUseCase } from "./reverse-transaction.use-case";

export interface ReverseMemberPaymentInput {
  orgId: string;
  authId: string;
  paymentId: string;
  // :userId do path (o beneficiario esperado pelo caller) — comparado contra
  // payment.userId logo apos o findById. Sem isso, um paymentId de outro
  // beneficiario e aceito silenciosamente (200) e o frontend invalida o
  // cache do membro ERRADO apos o estorno (achado do reviewer, Bloco 2).
  expectedUserId: string;
}

@Injectable()
export class ReverseMemberPaymentUseCase {
  constructor(
    @Inject(MEMBER_PAYMENT_REPOSITORY)
    private readonly memberPaymentRepo: IMemberPaymentRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    private readonly reverseTransaction: ReverseTransactionUseCase,
  ) {}

  async execute(input: ReverseMemberPaymentInput): Promise<MemberPaymentEntity> {
    const actor = await resolveActor(this.memberRepo, input.orgId, input.authId);
    if (!actor.isOwner) throw new CashierForbiddenException();

    const payment = await this.memberPaymentRepo.findById(
      input.paymentId,
      input.orgId,
    );
    if (!payment) throw new MemberPaymentNotFoundException(input.paymentId);

    // paymentId de um pagamento de OUTRO beneficiario que nao o :userId do
    // path — tratado como "nao encontrado" (mesmo codigo), nao como erro de
    // autorizacao separado: sem RLS cross-org (a query ja e (paymentId,
    // orgId)), mas o valor errado invalidaria o cache do membro errado.
    if (payment.userId !== input.expectedUserId) {
      throw new MemberPaymentNotFoundException(input.paymentId);
    }

    // Alvo ja e ele mesmo um estorno — nao existe "desestornar" (422, nao
    // 409: ver comentario em member-payment-not-reversible.exception.ts).
    if (payment.isReversal) {
      throw new MemberPaymentNotReversibleException(input.paymentId);
    }

    // Segundo estorno do mesmo pagamento (409). findReversedIds e org-wide,
    // sem filtro por userId — espelha drizzle-transaction.repository.ts:148
    // (ver doc-comment em member-payment.repository.interface.ts).
    const reversedIds = await this.memberPaymentRepo.findReversedIds(
      input.orgId,
    );
    if (reversedIds.has(payment.id)) {
      throw new MemberPaymentAlreadyReversedException(input.paymentId);
    }

    const reversalTransaction = await this.reverseTransaction.execute({
      orgId: input.orgId,
      transactionId: payment.transactionId,
      authId: input.authId,
    });

    // amountCents e userId NUNCA vem de input — sempre copiados do pagamento
    // original (requisito do passo 5/8 do plano do Bloco 2): um estorno com
    // valor diferente faz a formula do saldo excluir a linha original
    // inteira, tratando estorno parcial como estorno total em silencio.
    // findReversedIds e org-wide (sem filtro por userId) — copiar o userId
    // do original aqui e defesa em profundidade, nao garantia load-bearing
    // (ver doc-comment em member-payment.repository.interface.ts).
    return this.memberPaymentRepo.create({
      orgId: payment.orgId,
      userId: payment.userId,
      transactionId: reversalTransaction.id,
      amountCents: payment.amountCents,
      periodStart: payment.periodStart,
      periodEnd: payment.periodEnd,
      description: payment.description ? `Estorno: ${payment.description}` : null,
      reversesPaymentId: payment.id,
      createdBy: actor.userId,
    });
  }
}
