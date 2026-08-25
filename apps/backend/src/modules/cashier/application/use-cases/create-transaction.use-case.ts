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
import { AuditService } from "../../../audit/audit.service";
import { resolveActor, resolveCreatedBy } from "./resolve-actor";

export interface CreateTransactionInput {
  orgId: string;
  authId: string;
  createdBy?: string | null;
  trustedCreatedBy?: string | null;
  description: string;
  type: TransactionType;
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
    private readonly auditService: AuditService,
  ) {}

  async execute(input: CreateTransactionInput): Promise<TransactionEntity> {
    let createdBy: string | null;
    if (input.trustedCreatedBy !== undefined) {
      createdBy = input.trustedCreatedBy;
    } else {
      const { userId, isOwner } = await resolveActor(
        this.memberRepo,
        input.orgId,
        input.authId,
      );
      createdBy = await resolveCreatedBy(
        this.memberRepo,
        input.orgId,
        userId,
        isOwner,
        input.createdBy,
      );
    }

    const fee =
      input.type === "income"
        ? await this.feeRepo.findByOrgAndMethod(input.orgId, input.paymentMethod)
        : null;

    const { feeCents, netCents } = computeNet(
      input.grossCents,
      input.paymentMethod,
      fee,
    );

    const transaction = await this.transactionRepo.create({
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

    const isCorrection = input.trustedCreatedBy !== undefined;

    await this.auditService.logByAuthId(input.authId, {
      orgId: input.orgId,
      action: "cashier_transaction_created",
      entityType: "transaction",
      entityId: transaction.id,
      metadata: {
        type: input.type,
        grossCents: input.grossCents,
        feeCents,
        netCents,
        paymentMethod: input.paymentMethod,
        categoryId: input.categoryId ?? null,
        // No caminho de correção, `createdBy` vem de `trustedCreatedBy` (copiado de
        // transactions.created_by da transação original), coluna hoje heterogênea
        // entre auth id e users.id (perna de transferência grava auth id — ver
        // cashier.controller.ts). Não afirmar attributedTo nesse ramo evita
        // propagar essa confusão para o audit log.
        attributedTo: isCorrection ? null : createdBy,
        source: isCorrection ? "correction" : "manual",
        transactedAt: transaction.transactedAt,
      },
    });

    return transaction;
  }
}
