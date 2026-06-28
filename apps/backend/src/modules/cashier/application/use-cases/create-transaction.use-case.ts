import { Inject, Injectable } from "@nestjs/common";
import { computeNet } from "../../domain/fee-calculator";
import {
  PaymentMethod,
  TransactionEntity,
  TransactionType,
} from "../../domain/transaction.entity";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../domain/transaction.repository.interface";
import {
  IPaymentFeeRepository,
  PAYMENT_FEE_REPOSITORY,
} from "../../domain/payment-fee.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { resolveActor, resolveCreatedBy } from "./resolve-actor";

export interface CreateTransactionInput {
  orgId: string;
  /** Auth id (Supabase) de quem está lançando. */
  authId: string;
  /** users.id do membro atribuído (só owner; funcionário força = self). */
  createdBy?: string | null;
  /**
   * Atribuição confiável: quando definido, é usado direto como created_by, pulando
   * resolveActor/resolveCreatedBy. Só para chamadas internas que **preservam** a
   * autoria existente (ex.: errata de transação preserva o created_by original),
   * mesmo que o membro esteja inativo. Nunca exposto via API.
   */
  trustedCreatedBy?: string | null;
  description: string;
  type: TransactionType;
  /** Valor cheio lançado, em centavos. */
  grossCents: number;
  paymentMethod: PaymentMethod;
  categoryId?: string | null;
  transactedAt?: Date;
}

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    @Inject(PAYMENT_FEE_REPOSITORY)
    private readonly feeRepo: IPaymentFeeRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
  ) {}

  async execute(input: CreateTransactionInput): Promise<TransactionEntity> {
    // Atribuição confiável (errata): preserva a autoria original sem revalidar membro.
    let createdBy: string | null;
    if (input.trustedCreatedBy !== undefined) {
      createdBy = input.trustedCreatedBy;
    } else {
      const { userId, isOwner } = await resolveActor(
        this.memberRepo,
        input.orgId,
        input.authId,
      );
      // Funcionário força self; owner pode lançar em nome de um membro ativo.
      createdBy = await resolveCreatedBy(
        this.memberRepo,
        input.orgId,
        userId,
        isOwner,
        input.createdBy,
      );
    }

    // Taxa de cartão só faz sentido em entradas (dinheiro recebido).
    const fee =
      input.type === "income"
        ? await this.feeRepo.findByOrgAndMethod(input.orgId, input.paymentMethod)
        : null;

    const { feeCents, netCents } = computeNet(
      input.grossCents,
      input.paymentMethod,
      fee,
    );

    return this.transactionRepo.create({
      orgId: input.orgId,
      createdBy,
      description: input.description,
      type: input.type,
      grossCents: input.grossCents,
      feeCents,
      netCents,
      paymentMethod: input.paymentMethod,
      categoryId: input.categoryId ?? null,
      reversesTransactionId: null,
      transactedAt: input.transactedAt,
    });
  }
}
