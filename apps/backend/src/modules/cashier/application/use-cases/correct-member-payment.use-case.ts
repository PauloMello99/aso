import { Inject, Injectable } from "@nestjs/common";
import { PaymentMethod } from "../../domain/transaction.entity";
import { MemberPaymentEntity } from "../../domain/member-payment.entity";
import {
  IMemberPaymentRepository,
  MEMBER_PAYMENT_REPOSITORY,
} from "../../domain/member-payment.repository.interface";
import { MemberPaymentNotFoundException } from "../../domain/exceptions/member-payment-not-found.exception";
import { ReverseMemberPaymentUseCase } from "./reverse-member-payment.use-case";
import { CreateMemberPaymentUseCase } from "./create-member-payment.use-case";

export interface CorrectMemberPaymentInput {
  orgId: string;
  authId: string;
  paymentId: string;
  // :userId do path (o beneficiario esperado pelo caller) — ver comentario
  // equivalente em ReverseMemberPaymentInput.
  expectedUserId: string;
  amountCents: number;
  paymentMethod: PaymentMethod;
  description: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  transactedAt?: Date;
}

export interface CorrectMemberPaymentResult {
  reversal: MemberPaymentEntity;
  replacement: MemberPaymentEntity;
}

@Injectable()
export class CorrectMemberPaymentUseCase {
  constructor(
    @Inject(MEMBER_PAYMENT_REPOSITORY)
    private readonly memberPaymentRepo: IMemberPaymentRepository,
    private readonly reverseMemberPayment: ReverseMemberPaymentUseCase,
    private readonly createMemberPayment: CreateMemberPaymentUseCase,
  ) {}

  async execute(
    input: CorrectMemberPaymentInput,
  ): Promise<CorrectMemberPaymentResult> {
    const original = await this.memberPaymentRepo.findById(
      input.paymentId,
      input.orgId,
    );
    if (!original) throw new MemberPaymentNotFoundException(input.paymentId);

    // paymentId de um pagamento de OUTRO beneficiario que nao o :userId do
    // path — mesma logica de ReverseMemberPaymentUseCase (tratado como "nao
    // encontrado"). ReverseMemberPaymentUseCase repete a checagem com o
    // mesmo expectedUserId, mas o guard aqui evita chamar
    // CreateMemberPaymentUseCase com um beneficiario errado caso o estorno
    // um dia deixe de validar.
    if (original.userId !== input.expectedUserId) {
      throw new MemberPaymentNotFoundException(input.paymentId);
    }

    const reversal = await this.reverseMemberPayment.execute({
      orgId: input.orgId,
      authId: input.authId,
      paymentId: input.paymentId,
      expectedUserId: input.expectedUserId,
    });

    // O beneficiario do relancamento e SEMPRE o do pagamento original sendo
    // corrigido — nao se "corrige" um pagamento para outro membro. Nao vem
    // de input.
    const replacement = await this.createMemberPayment.execute({
      orgId: input.orgId,
      authId: input.authId,
      userId: original.userId,
      amountCents: input.amountCents,
      paymentMethod: input.paymentMethod,
      description: input.description,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      transactedAt: input.transactedAt,
    });

    return { reversal, replacement };
  }
}
