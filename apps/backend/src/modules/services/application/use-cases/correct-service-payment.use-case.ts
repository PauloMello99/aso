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
import {
  IMemberPaymentFeeRepository,
  MEMBER_PAYMENT_FEE_REPOSITORY,
} from "../../../cashier/domain/member-payment-fee.repository.interface";
import { computeNet, resolveFee } from "../../../cashier/domain/fee-calculator";
import { computeCommission } from "../../../cashier/domain/commission-calculator";
import type { CommissionMode } from "../../../cashier/domain/member-commission.entity";
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
    @Inject(MEMBER_PAYMENT_FEE_REPOSITORY)
    private readonly memberFeeRepo: IMemberPaymentFeeRepository,
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
      // Estorno contábil: espelha os números do original LITERALMENTE e NÃO
      // replica o snapshot de taxa (não é nova cobrança) — fonte "none".
      feeConfigId: null,
      feePercent: null,
      feeFixedCents: null,
      feeSource: "none",
    });

    // Substituição = novo pagamento corrigido: reconsulta a config de taxa
    // VIGENTE (sem preservar snapshot de fee). Só muda a FONTE: a taxa de quem
    // EXECUTOU o serviço (`service.performedBy`, mesmo `users.id` da comissão)
    // tem prioridade; sem taxa própria ativa cai na taxa da ORG, como antes.
    const memberFee = service.performedBy
      ? await this.memberFeeRepo.findActiveByOrgUserAndMethod(
          input.orgId,
          service.performedBy,
          input.paymentMethod,
        )
      : null;
    const orgFee = await this.feeRepo.findByOrgAndMethod(
      input.orgId,
      input.paymentMethod,
    );
    const resolved = resolveFee(input.paymentMethod, memberFee, orgFee);
    const { feeCents, netCents } = computeNet(
      input.grossCents,
      input.paymentMethod,
      resolved.config,
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
      feeConfigId: resolved.configId,
      feePercent: resolved.config?.percent ?? null,
      feeFixedCents: resolved.config?.fixedCents ?? null,
      feeSource: resolved.source,
      transactedAt: input.transactedAt,
    });

    // Preserva o percentual/modo do snapshot ORIGINAL do serviço — NUNCA
    // consulta a config vigente aqui (precificaria retroativamente um
    // evento passado com o percentual de hoje). Só baseCents/commissionCents
    // são recalculados sobre o novo valor/método corrigido.
    const snapshotConfig =
      service.commissionPercent && service.commissionMode
        ? {
            percent: service.commissionPercent,
            mode: service.commissionMode as CommissionMode,
          }
        : null;
    // `netCents` acima já embute a taxa do EXECUTOR quando `service.performedBy`
    // tem taxa própria ativa; em modo `net` a comissão passa a refletir essa
    // taxa (consequência PRETENDIDA — mesma dos passos 13 / register-payment).
    const { baseCents, commissionCents } = computeCommission(
      input.grossCents,
      netCents,
      snapshotConfig,
    );

    await this.serviceRepo.correctPayment(
      service.id,
      { amountCents: input.grossCents, paymentMethod: input.paymentMethod },
      replacement.id,
      {
        configId: service.commissionConfigId,
        percent: service.commissionPercent,
        mode: service.commissionMode,
        baseCents,
        commissionCents,
      },
    );

    const fresh = await this.serviceRepo.findById(service.id, input.orgId);
    return fresh ?? service;
  }
}
