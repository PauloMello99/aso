import { Inject, Injectable } from "@nestjs/common";
import {
  IServiceRepository,
  SERVICE_REPOSITORY,
} from "../../domain/service.repository.interface";
import { ServiceEntity, type PaymentMethod } from "../../domain/service.entity";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../../cashier/domain/transaction.repository.interface";
import {
  IPaymentFeeRepository,
  PAYMENT_FEE_REPOSITORY,
} from "../../../cashier/domain/payment-fee.repository.interface";
import { computeNet } from "../../../cashier/domain/fee-calculator";
import {
  ITransactionCategoryRepository,
  TRANSACTION_CATEGORY_REPOSITORY,
} from "../../../cashier/domain/transaction-category.repository.interface";
import { resolveReversalCategoryId } from "../../../cashier/domain/reversal-category";
import { ServiceNotFoundException } from "../../domain/exceptions/service-not-found.exception";
import { ServiceAlreadyCanceledException } from "../../domain/exceptions/service-already-canceled.exception";
import { ServiceForbiddenException } from "../../domain/exceptions/service-forbidden.exception";
import { ServicePaymentNotCorrectableException } from "../../domain/exceptions/service-payment-not-correctable.exception";
import { resolveMembership } from "./resolve-membership";

export interface CorrectServicePaymentInput {
  orgId: string;
  serviceId: string;
  authId: string;
  grossCents: number;
  paymentMethod: PaymentMethod;
  description?: string | null;
  transactedAt?: Date;
}

@Injectable()
export class CorrectServicePaymentUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    @Inject(PAYMENT_FEE_REPOSITORY)
    private readonly feeRepo: IPaymentFeeRepository,
    @Inject(TRANSACTION_CATEGORY_REPOSITORY)
    private readonly categoryRepo: ITransactionCategoryRepository,
  ) {}

  async execute(input: CorrectServicePaymentInput): Promise<ServiceEntity> {
    const { userId: currentUserId, isOwner } = await resolveMembership(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    if (!isOwner) throw new ServiceForbiddenException();

    const service = await this.serviceRepo.findById(
      input.serviceId,
      input.orgId,
    );
    if (!service) throw new ServiceNotFoundException(input.serviceId);

    if (service.isCanceled) {
      throw new ServiceAlreadyCanceledException(input.serviceId);
    }

    if (!service.paymentTransactionId) {
      throw new ServicePaymentNotCorrectableException(input.serviceId);
    }

    const original = await this.transactionRepo.findById(
      service.paymentTransactionId,
      input.orgId,
    );
    if (!original || original.isReversal) {
      throw new ServicePaymentNotCorrectableException(input.serviceId);
    }

    const existingReversal = await this.transactionRepo.findReversalOf(
      original.id,
    );
    if (existingReversal) {
      throw new ServicePaymentNotCorrectableException(input.serviceId);
    }

    const reversalCategoryId = await resolveReversalCategoryId(
      this.categoryRepo,
      input.orgId,
    );

    await this.transactionRepo.create({
      orgId: input.orgId,
      createdBy: currentUserId,
      description: `Estorno: ${original.description}`,
      type: original.type === "income" ? "outcome" : "income",
      grossCents: original.grossCents,
      feeCents: original.feeCents,
      netCents: original.netCents,
      paymentMethod: original.paymentMethod,
      categoryId: reversalCategoryId,
      reversesTransactionId: original.id,
    });

    const fee = await this.feeRepo.findByOrgAndMethod(
      input.orgId,
      input.paymentMethod,
    );
    const { feeCents, netCents } = computeNet(
      input.grossCents,
      input.paymentMethod,
      fee,
    );
    const replacement = await this.transactionRepo.create({
      orgId: input.orgId,
      createdBy: original.createdBy,
      description: input.description?.trim() || original.description,
      type: "income",
      grossCents: input.grossCents,
      feeCents,
      netCents,
      paymentMethod: input.paymentMethod,
      transactedAt: input.transactedAt,
    });

    await this.serviceRepo.correctPayment(
      service.id,
      { amountCents: input.grossCents, paymentMethod: input.paymentMethod },
      replacement.id,
    );

    const fresh = await this.serviceRepo.findById(service.id, input.orgId);
    return fresh ?? service;
  }
}
