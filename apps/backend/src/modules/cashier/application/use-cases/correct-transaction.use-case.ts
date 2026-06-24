import { Injectable } from "@nestjs/common";
import { TransactionEntity, PaymentMethod, TransactionType } from "../../domain/transaction.entity";
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
    private readonly reverseTransaction: ReverseTransactionUseCase,
    private readonly createTransaction: CreateTransactionUseCase,
  ) {}

  async execute(
    input: CorrectTransactionInput,
  ): Promise<CorrectTransactionResult> {
    const reversal = await this.reverseTransaction.execute({
      orgId: input.orgId,
      transactionId: input.transactionId,
      reversedBy: input.correctedBy,
    });

    // Correção é owner-only (guard): o owner é o ator; o lançamento corrigido
    // fica atribuído a ele (createdBy default = self via resolveActor).
    const replacement = await this.createTransaction.execute({
      orgId: input.orgId,
      authId: input.correctedBy ?? "",
      description: input.description,
      type: input.type,
      grossCents: input.grossCents,
      paymentMethod: input.paymentMethod,
      transactedAt: input.transactedAt,
    });

    return { reversal, replacement };
  }
}
