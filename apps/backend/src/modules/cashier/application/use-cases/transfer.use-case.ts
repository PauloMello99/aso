import { Inject, Injectable } from "@nestjs/common";
import {
  TransactionEntity,
  TransferMethod,
} from "../../domain/transaction.entity";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../domain/transaction.repository.interface";

export interface TransferInput {
  orgId: string;
  createdBy?: string | null;
  fromMethod: TransferMethod;
  toMethod: TransferMethod;
  amountCents: number;
  description?: string;
  transactedAt?: Date;
}

export interface TransferResult {
  outcome: TransactionEntity;
  income: TransactionEntity;
}

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
