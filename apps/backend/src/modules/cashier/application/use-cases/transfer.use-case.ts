import { Inject, Injectable } from "@nestjs/common";
import {
  TransactionEntity,
  TransferMethod,
} from "../../domain/transaction.entity";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../domain/transaction.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { resolveActor } from "./resolve-actor";

export interface TransferInput {
  orgId: string;
  authId: string;
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
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
  ) {}

  async execute(input: TransferInput): Promise<TransferResult> {
    const when = input.transactedAt ?? new Date();
    const label = input.description?.trim() || "Transferência";

    const { userId: createdBy } = await resolveActor(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    const outcome = await this.transactionRepo.create({
      orgId: input.orgId,
      createdBy,
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
      createdBy,
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
