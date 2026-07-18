import { Inject, Injectable } from "@nestjs/common";
import {
  IServiceRepository,
  SERVICE_REPOSITORY,
} from "../../domain/service.repository.interface";
import { ServiceEntity } from "../../domain/service.entity";
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
import { ServiceNotFoundException } from "../../domain/exceptions/service-not-found.exception";
import { ServiceNotPayableException } from "../../domain/exceptions/service-not-payable.exception";
import { ServiceForbiddenException } from "../../domain/exceptions/service-forbidden.exception";
import { resolveMembership } from "./resolve-membership";

export interface RegisterPaymentInput {
  orgId: string;
  serviceId: string;
  authId: string;
}

@Injectable()
export class RegisterPaymentUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    @Inject(PAYMENT_FEE_REPOSITORY)
    private readonly feeRepo: IPaymentFeeRepository,
  ) {}

  async execute(input: RegisterPaymentInput): Promise<ServiceEntity> {
    const { userId: currentUserId, isOwner } = await resolveMembership(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    const service = await this.serviceRepo.findById(
      input.serviceId,
      input.orgId,
    );
    if (!service) throw new ServiceNotFoundException(input.serviceId);

    if (!isOwner && service.performedBy !== currentUserId) {
      throw new ServiceForbiddenException();
    }

    if (service.status !== "pending") {
      throw new ServiceNotPayableException(input.serviceId);
    }

    const fee = await this.feeRepo.findByOrgAndMethod(
      input.orgId,
      service.paymentMethod,
    );
    const { feeCents, netCents } = computeNet(
      service.amountCents,
      service.paymentMethod,
      fee,
    );
    const tx = await this.transactionRepo.create({
      orgId: input.orgId,
      createdBy: currentUserId,
      description: `Serviço${service.customerName ? ` — ${service.customerName}` : ""}`,
      type: "income",
      grossCents: service.amountCents,
      feeCents,
      netCents,
      paymentMethod: service.paymentMethod,
    });
    await this.serviceRepo.setPaymentTransaction(service.id, tx.id);

    const fresh = await this.serviceRepo.findById(service.id, input.orgId);
    return fresh ?? service;
  }
}
