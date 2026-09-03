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
import {
  IMemberPaymentFeeRepository,
  MEMBER_PAYMENT_FEE_REPOSITORY,
} from "../../../cashier/domain/member-payment-fee.repository.interface";
import { computeNet, resolveFee } from "../../../cashier/domain/fee-calculator";
import { computeCommission } from "../../../cashier/domain/commission-calculator";
import {
  IMemberCommissionRepository,
  MEMBER_COMMISSION_REPOSITORY,
} from "../../../cashier/domain/member-commission.repository.interface";
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
    @Inject(MEMBER_PAYMENT_FEE_REPOSITORY)
    private readonly memberFeeRepo: IMemberPaymentFeeRepository,
    @Inject(MEMBER_COMMISSION_REPOSITORY)
    private readonly commissionRepo: IMemberCommissionRepository,
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

    // Taxa de pagamento: a de quem EXECUTOU o serviço (`service.performedBy`, o
    // mesmo `users.id` usado pela comissão) tem prioridade; sem taxa própria
    // ativa cai na taxa da ORG, como antes.
    const memberFee = service.performedBy
      ? await this.memberFeeRepo.findActiveByOrgUserAndMethod(
          input.orgId,
          service.performedBy,
          service.paymentMethod,
        )
      : null;
    const orgFee = await this.feeRepo.findByOrgAndMethod(
      input.orgId,
      service.paymentMethod,
    );
    const resolved = resolveFee(service.paymentMethod, memberFee, orgFee);
    const { feeCents, netCents } = computeNet(
      service.amountCents,
      service.paymentMethod,
      resolved.config,
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
      feeConfigId: resolved.configId,
      feePercent: resolved.config?.percent ?? null,
      feeFixedCents: resolved.config?.fixedCents ?? null,
      feeSource: resolved.source,
    });

    const config = service.performedBy
      ? await this.commissionRepo.findActiveByOrgAndUser(
          input.orgId,
          service.performedBy,
        )
      : null;
    // ORDEM PRESERVADA: este `netCents` já embute a taxa do executor quando
    // `service.performedBy` tem taxa própria ativa, e continua sendo a base da
    // comissão em modo `net` — logo a comissão nesse modo passa a refletir a
    // taxa do funcionário (consequência PRETENDIDA).
    const { baseCents, commissionCents } = computeCommission(
      service.amountCents,
      netCents,
      config,
    );

    await this.serviceRepo.setPaymentTransaction(service.id, tx.id, {
      configId: config?.id ?? null,
      percent: config?.percent ?? null,
      mode: config?.mode ?? null,
      baseCents,
      commissionCents,
    });

    const fresh = await this.serviceRepo.findById(service.id, input.orgId);
    return fresh ?? service;
  }
}
