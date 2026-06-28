import { Inject, Injectable } from "@nestjs/common";
import { PaymentMethod, TransactionEntity } from "../../domain/transaction.entity";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../domain/transaction.repository.interface";

export interface TransferInput {
  orgId: string;
  createdBy?: string | null;
  fromMethod: PaymentMethod;
  toMethod: PaymentMethod;
  amountCents: number;
  description?: string;
  transactedAt?: Date;
}

export interface TransferResult {
  outcome: TransactionEntity;
  income: TransactionEntity;
}

/**
 * Transferência entre meios (ex.: dinheiro → banco): cria duas transações —
 * uma saída no método de origem e uma entrada no destino, mesmo valor, sem taxa.
 * Substitui o vai-e-vem manual de lançar saída + entrada (e o risco de erro).
 */
@Injectable()
export class TransferUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
  ) {}

  async execute(input: TransferInput): Promise<TransferResult> {
    const when = input.transactedAt ?? new Date();
    const label = input.description?.trim() || "Transferência";

    const outcome = await this.transactionRepo.create({
      orgId: input.orgId,
      createdBy: input.createdBy ?? null,
      description: `${label} (saída)`,
      type: "outcome",
      grossCents: input.amountCents,
      feeCents: 0,
      netCents: input.amountCents,
      paymentMethod: input.fromMethod,
      reversesTransactionId: null,
      transactedAt: when,
    });

    const income = await this.transactionRepo.create({
      orgId: input.orgId,
      createdBy: input.createdBy ?? null,
      description: `${label} (entrada)`,
      type: "income",
      grossCents: input.amountCents,
      feeCents: 0,
      netCents: input.amountCents,
      paymentMethod: input.toMethod,
      reversesTransactionId: null,
      transactedAt: when,
    });

    return { outcome, income };
  }
}
