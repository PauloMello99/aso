import { Inject, Injectable } from "@nestjs/common";
import { TransactionEntity } from "../../domain/transaction.entity";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../domain/transaction.repository.interface";
import { TransactionNotFoundException } from "../../domain/exceptions/transaction-not-found.exception";
import { TransactionAlreadyReversedException } from "../../domain/exceptions/transaction-already-reversed.exception";
import { TransactionNotReversibleException } from "../../domain/exceptions/transaction-not-reversible.exception";

export interface ReverseTransactionInput {
  orgId: string;
  transactionId: string;
  reversedBy?: string | null;
}

@Injectable()
export class ReverseTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
  ) {}

  async execute(input: ReverseTransactionInput): Promise<TransactionEntity> {
    const original = await this.transactionRepo.findById(
      input.transactionId,
      input.orgId,
    );
    if (!original) throw new TransactionNotFoundException(input.transactionId);

    // Não se estorna um estorno.
    if (original.isReversal) {
      throw new TransactionNotReversibleException(input.transactionId);
    }

    const existingReversal = await this.transactionRepo.findReversalOf(
      original.id,
    );
    if (existingReversal) {
      throw new TransactionAlreadyReversedException(input.transactionId);
    }

    // Linha de estorno: tipo oposto, mesmos valores, vínculo com a original.
    return this.transactionRepo.create({
      orgId: original.orgId,
      createdBy: input.reversedBy ?? null,
      description: `Estorno: ${original.description}`,
      type: original.type === "income" ? "outcome" : "income",
      grossCents: original.grossCents,
      feeCents: original.feeCents,
      netCents: original.netCents,
      paymentMethod: original.paymentMethod,
      reversesTransactionId: original.id,
      transactedAt: new Date(),
    });
  }
}
