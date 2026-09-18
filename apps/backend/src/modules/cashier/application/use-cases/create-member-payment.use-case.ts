import { Inject, Injectable } from "@nestjs/common";
import { PaymentMethod } from "../../domain/transaction.entity";
import { MemberPaymentEntity } from "../../domain/member-payment.entity";
import {
  IMemberPaymentRepository,
  MEMBER_PAYMENT_REPOSITORY,
} from "../../domain/member-payment.repository.interface";
import {
  ITransactionCategoryRepository,
  TRANSACTION_CATEGORY_REPOSITORY,
} from "../../domain/transaction-category.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { resolveMemberPaymentCategoryId } from "../../domain/member-payment-category";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";
import { PaymentMemberNotFoundException } from "../../domain/exceptions/payment-member-not-found.exception";
import { resolveActor } from "./resolve-actor";
import { CreateTransactionUseCase } from "./create-transaction.use-case";

export interface CreateMemberPaymentInput {
  orgId: string;
  authId: string;
  /** Beneficiario do pagamento — NAO confundir com o owner que executa a acao. */
  userId: string;
  amountCents: number;
  paymentMethod: PaymentMethod;
  description: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  transactedAt?: Date;
}

@Injectable()
export class CreateMemberPaymentUseCase {
  constructor(
    @Inject(MEMBER_PAYMENT_REPOSITORY)
    private readonly memberPaymentRepo: IMemberPaymentRepository,
    @Inject(TRANSACTION_CATEGORY_REPOSITORY)
    private readonly categoryRepo: ITransactionCategoryRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    private readonly createTransactionUseCase: CreateTransactionUseCase,
  ) {}

  async execute(input: CreateMemberPaymentInput): Promise<MemberPaymentEntity> {
    // NOTA (risco a resolver no passo 9 — controller/guard): resolveActor
    // computa isOwner por comparação direta de role em org_memberships e NÃO
    // reconhece super_admin como owner (ADR-0013), diferente de
    // orgRepo.isOwner (drizzle-org.repository.ts) — usado pelo OrgOwnerGuard
    // e por UpsertMemberCommissionsUseCase. Segue explicitamente resolveActor
    // aqui por instrução do plano do Bloco 2 (passo 6) e por consistência com
    // o precedente já vivo em CreateTransactionUseCase/ReverseTransactionUseCase
    // (mesmo módulo, mesmo padrão). Efeito: um super_admin sem membership
    // própria na org pode passar pelo OrgOwnerGuard e ainda assim receber 403
    // aqui. Se isso for inaceitável, o passo 9 deve trocar este gate para
    // orgRepo.isOwner (ou resolveActor precisa aprender sobre super_admin) —
    // decisão do thread principal, não tomada aqui.
    const actor = await resolveActor(this.memberRepo, input.orgId, input.authId);
    if (!actor.isOwner) throw new CashierForbiddenException();

    const members = await this.memberRepo.findAllByOrg(input.orgId);
    const beneficiary = members.find(
      (member) => member.userId === input.userId && member.enabled,
    );
    if (!beneficiary) throw new PaymentMemberNotFoundException(input.userId);

    const categoryId = await resolveMemberPaymentCategoryId(
      this.categoryRepo,
      input.orgId,
    );

    // Sem db.transaction() explicito: a atomicidade da dupla escrita (transacao
    // do caixa + linha de org_member_payments) vem do BEGIN aberto pelo
    // RlsContext.runWithClaims no inicio do request (database.module.ts) — ver
    // comentario no topo de drizzle-member-payment.repository.ts. Um
    // .transaction() aqui seria redundante (viraria SAVEPOINT via Proxy) e nao
    // deve ser "consertado" depois achando que falta.
    const transaction = await this.createTransactionUseCase.execute({
      orgId: input.orgId,
      authId: input.authId,
      type: "outcome",
      grossCents: input.amountCents,
      paymentMethod: input.paymentMethod,
      categoryId,
      description: input.description,
      transactedAt: input.transactedAt,
    });

    return this.memberPaymentRepo.create({
      orgId: input.orgId,
      userId: input.userId,
      transactionId: transaction.id,
      amountCents: input.amountCents,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      description: input.description,
      reversesPaymentId: null,
      createdBy: actor.userId,
    });
  }
}
