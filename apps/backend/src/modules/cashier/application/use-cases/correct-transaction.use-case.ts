import { Inject, Injectable } from "@nestjs/common";
import { TransactionEntity, PaymentMethod, TransactionType } from "../../domain/transaction.entity";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../domain/transaction.repository.interface";
import { TransactionNotFoundException } from "../../domain/exceptions/transaction-not-found.exception";
import { TransactionIsServicePaymentException } from "../../domain/exceptions/transaction-is-service-payment.exception";
import {
  IServiceRepository,
  SERVICE_REPOSITORY,
} from "../../../services/domain/service.repository.interface";
import { ReverseTransactionUseCase } from "./reverse-transaction.use-case";
import { CreateTransactionUseCase } from "./create-transaction.use-case";

export interface CorrectTransactionInput {
  orgId: string;
  transactionId: string;
  correctedBy?: string | null;
  // Novos valores do lançamento corrigido.
  description: string;
  type: TransactionType;
  grossCents: number;
  paymentMethod: PaymentMethod;
  transactedAt?: Date;
}

export interface CorrectTransactionResult {
  reversal: TransactionEntity;
  replacement: TransactionEntity;
}

/**
 * Errata combinada: estorna a transação original e cria um novo lançamento
 * corrigido — preservando o append-only (nada é editado). Reaproveita os
 * use-cases de estorno e criação, então todas as validações se aplicam.
 */
@Injectable()
export class CorrectTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
    private readonly reverseTransaction: ReverseTransactionUseCase,
    private readonly createTransaction: CreateTransactionUseCase,
  ) {}

  async execute(
    input: CorrectTransactionInput,
  ): Promise<CorrectTransactionResult> {
    // Autoria a preservar no lançamento corrigido (errata mantém quem lançou,
    // não migra para o owner que corrige). Lido antes do estorno.
    const original = await this.transactionRepo.findById(
      input.transactionId,
      input.orgId,
    );
    if (!original) throw new TransactionNotFoundException(input.transactionId);

    // Lançamento vinculado a um serviço só pode ser corrigido pelo fluxo
    // dedicado (PATCH /services/:id/payment), que mantém amount_cents e
    // payment_transaction_id do serviço em sincronia com o caixa.
    if (
      await this.serviceRepo.existsByPaymentTransactionId(input.transactionId)
    ) {
      throw new TransactionIsServicePaymentException(input.transactionId);
    }

    const reversal = await this.reverseTransaction.execute({
      orgId: input.orgId,
      transactionId: input.transactionId,
      reversedBy: input.correctedBy,
    });

    // Correção é owner-only (guard). O lançamento corrigido **preserva** o
    // created_by original (atribuição confiável — não revalida membro).
    const replacement = await this.createTransaction.execute({
      orgId: input.orgId,
      authId: input.correctedBy ?? "",
      trustedCreatedBy: original.createdBy,
      description: input.description,
      type: input.type,
      grossCents: input.grossCents,
      paymentMethod: input.paymentMethod,
      transactedAt: input.transactedAt,
    });

    return { reversal, replacement };
  }
}
