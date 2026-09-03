import { Inject, Injectable } from "@nestjs/common";
import { TransactionEntity } from "../../domain/transaction.entity";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../domain/transaction.repository.interface";
import { TransactionNotFoundException } from "../../domain/exceptions/transaction-not-found.exception";
import { TransactionAlreadyReversedException } from "../../domain/exceptions/transaction-already-reversed.exception";
import { TransactionNotReversibleException } from "../../domain/exceptions/transaction-not-reversible.exception";
import { TransactionIsServicePaymentException } from "../../domain/exceptions/transaction-is-service-payment.exception";
import {
  IServiceRepository,
  SERVICE_REPOSITORY,
} from "../../../services/domain/service.repository.interface";
import {
  ITransactionCategoryRepository,
  TRANSACTION_CATEGORY_REPOSITORY,
} from "../../domain/transaction-category.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { resolveReversalCategoryId } from "../../domain/reversal-category";
import { resolveActor } from "./resolve-actor";

export interface ReverseTransactionInput {
  orgId: string;
  transactionId: string;
  authId: string;
}

@Injectable()
export class ReverseTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
    @Inject(TRANSACTION_CATEGORY_REPOSITORY)
    private readonly categoryRepo: ITransactionCategoryRepository,
  ) {}

  async execute(input: ReverseTransactionInput): Promise<TransactionEntity> {
    const original = await this.transactionRepo.findById(
      input.transactionId,
      input.orgId,
    );
    if (!original) throw new TransactionNotFoundException(input.transactionId);

    if (
      await this.serviceRepo.existsByPaymentTransactionId(input.transactionId)
    ) {
      throw new TransactionIsServicePaymentException(input.transactionId);
    }

    if (original.isReversal) {
      throw new TransactionNotReversibleException(input.transactionId);
    }

    const existingReversal = await this.transactionRepo.findReversalOf(
      original.id,
    );
    if (existingReversal) {
      throw new TransactionAlreadyReversedException(input.transactionId);
    }

    const { userId: createdBy } = await resolveActor(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    const categoryId = await resolveReversalCategoryId(
      this.categoryRepo,
      original.orgId,
    );

    return this.transactionRepo.create({
      orgId: original.orgId,
      createdBy,
      description: `Estorno: ${original.description}`,
      type: original.type === "income" ? "outcome" : "income",
      grossCents: original.grossCents,
      feeCents: original.feeCents,
      netCents: original.netCents,
      paymentMethod: original.paymentMethod,
      categoryId,
      reversesTransactionId: original.id,
      transactedAt: new Date(),
    });
  }
}
