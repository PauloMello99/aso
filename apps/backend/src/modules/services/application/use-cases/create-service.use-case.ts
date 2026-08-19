import { Inject, Injectable } from "@nestjs/common";
import {
  IServiceRepository,
  SERVICE_REPOSITORY,
  type CreateServiceMaterialData,
} from "../../domain/service.repository.interface";
import {
  IServiceTypeRepository,
  SERVICE_TYPE_REPOSITORY,
} from "../../domain/service-type.repository.interface";
import { ServiceEntity, type PaymentMethod } from "../../domain/service.entity";
import {
  ICustomerRepository,
  CUSTOMER_REPOSITORY,
} from "../../../customers/domain/customer.repository.interface";
import type { CustomerEntity } from "../../../customers/domain/customer.entity";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import {
  IMaterialRepository,
  MATERIAL_REPOSITORY,
} from "../../../materials/domain/material.repository.interface";
import {
  IStockMovementRepository,
  STOCK_MOVEMENT_REPOSITORY,
} from "../../../materials/domain/stock-movement.repository.interface";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../../cashier/domain/transaction.repository.interface";
import {
  IPaymentFeeRepository,
  PAYMENT_FEE_REPOSITORY,
} from "../../../cashier/domain/payment-fee.repository.interface";
import { computeNet } from "../../../cashier/domain/fee-calculator";
import { computeCommission } from "../../../cashier/domain/commission-calculator";
import {
  IMemberCommissionRepository,
  MEMBER_COMMISSION_REPOSITORY,
} from "../../../cashier/domain/member-commission.repository.interface";
import { CustomerDisabledException } from "../../domain/exceptions/customer-disabled.exception";
import { MaterialNotFoundException } from "../../../materials/domain/exceptions/material-not-found.exception";
import { InsufficientStockException } from "../../../materials/domain/exceptions/insufficient-stock.exception";
import { ServiceMaterialRequiredException } from "../../domain/exceptions/service-material-required.exception";
import {
  IAnamnesisResponseRepository,
  ANAMNESIS_RESPONSE_REPOSITORY,
} from "../../../anamnesis/domain/anamnesis-response.repository.interface";
import {
  IAnamnesisFormRepository,
  ANAMNESIS_FORM_REPOSITORY,
} from "../../../anamnesis/domain/anamnesis-form.repository.interface";
import { resolvePerformer } from "./resolve-performer";
import { resolveMembership } from "./resolve-membership";
import { assertPerformedAtNotFuture } from "./assert-performed-at-not-future";
import { assertAgeVerification } from "./assert-age-verification";
import { assertAnamnesisResponseLinkable } from "./assert-anamnesis-response-linkable";

export interface ServiceMaterialInput {
  materialId: string;
  quantity?: number;
  finished?: boolean;
}

export interface CreateServiceInput {
  orgId: string;
  authId: string;
  customerId?: string | null;
  serviceTypeId?: string | null;
  performedBy?: string | null;
  description?: string | null;
  anamnesisResponseId?: string | null;
  amountCents: number;
  paymentMethod: PaymentMethod;
  paymentStatus: "paid" | "pending";
  performedAt?: Date;
  materials: ServiceMaterialInput[];
}

@Injectable()
export class CreateServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
    @Inject(SERVICE_TYPE_REPOSITORY)
    private readonly serviceTypeRepo: IServiceTypeRepository,
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: ICustomerRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    @Inject(MATERIAL_REPOSITORY)
    private readonly materialRepo: IMaterialRepository,
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly movementRepo: IStockMovementRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    @Inject(PAYMENT_FEE_REPOSITORY)
    private readonly feeRepo: IPaymentFeeRepository,
    @Inject(ANAMNESIS_RESPONSE_REPOSITORY)
    private readonly anamnesisResponseRepo: IAnamnesisResponseRepository,
    @Inject(ANAMNESIS_FORM_REPOSITORY)
    private readonly anamnesisFormRepo: IAnamnesisFormRepository,
    @Inject(MEMBER_COMMISSION_REPOSITORY)
    private readonly commissionRepo: IMemberCommissionRepository,
  ) {}

  async execute(input: CreateServiceInput): Promise<ServiceEntity> {
    assertPerformedAtNotFuture(input.performedAt);

    const { userId: currentUserId, isOwner } = await resolveMembership(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    let customer: CustomerEntity | null = null;
    if (input.customerId) {
      customer = await this.customerRepo.findById(
        input.customerId,
        input.orgId,
      );
      if (!customer) throw new CustomerDisabledException(input.customerId);
      if (!customer.enabled) {
        throw new CustomerDisabledException(input.customerId);
      }
    }

    const serviceType = input.serviceTypeId
      ? await this.serviceTypeRepo.findById(input.serviceTypeId, input.orgId)
      : null;
    assertAgeVerification(
      serviceType,
      customer,
      input.performedAt ?? new Date(),
    );

    if (input.anamnesisResponseId) {
      await assertAnamnesisResponseLinkable(
        this.anamnesisResponseRepo,
        input.orgId,
        input.anamnesisResponseId,
        input.customerId ?? null,
        input.serviceTypeId ?? null,
        this.anamnesisFormRepo,
        false,
      );
    }

    const performedBy = await resolvePerformer(
      this.memberRepo,
      input.orgId,
      currentUserId,
      isOwner,
      input.performedBy,
    );

    const debits: { materialId: string; delta: string }[] = [];
    const toRecord: CreateServiceMaterialData[] = [];

    for (const line of input.materials) {
      const material = await this.materialRepo.findById(
        line.materialId,
        input.orgId,
      );
      if (!material) throw new MaterialNotFoundException(line.materialId);

      let qty: number;
      if (material.shareable) {
        if (!line.finished) continue;
        qty = 1;
      } else {
        qty = line.quantity ?? 0;
        if (qty <= 0) continue;
        const available = parseFloat(material.stockQuantity);
        if (available < qty) {
          throw new InsufficientStockException(
            material.id,
            material.stockQuantity,
            String(qty),
          );
        }
      }

      toRecord.push({ materialId: material.id, quantity: String(qty) });
      debits.push({ materialId: material.id, delta: String(-qty) });
    }

    if (toRecord.length === 0) {
      throw new ServiceMaterialRequiredException();
    }

    const service = await this.serviceRepo.create(
      {
        orgId: input.orgId,
        serviceTypeId: input.serviceTypeId ?? null,
        customerId: input.customerId ?? null,
        performedBy,
        createdBy: currentUserId,
        description: input.description ?? null,
        anamnesisResponseId: input.anamnesisResponseId ?? null,
        amountCents: input.amountCents,
        paymentMethod: input.paymentMethod,
        performedAt: input.performedAt,
      },
      toRecord,
    );

    for (const debit of debits) {
      await this.materialRepo.updateStockQuantity(debit.materialId, debit.delta);
      await this.movementRepo.create({
        orgId: input.orgId,
        materialId: debit.materialId,
        type: "service_consumption",
        quantityDelta: debit.delta,
        serviceId: service.id,
        createdBy: currentUserId,
      });
      await this.materialRepo.touchLastUsed(debit.materialId);
    }

    if (input.paymentStatus === "paid") {
      const fee = await this.feeRepo.findByOrgAndMethod(
        input.orgId,
        input.paymentMethod,
      );
      const { feeCents, netCents } = computeNet(
        input.amountCents,
        input.paymentMethod,
        fee,
      );
      const tx = await this.transactionRepo.create({
        orgId: input.orgId,
        createdBy: currentUserId,
        description: `Serviço${service.customerName ? ` — ${service.customerName}` : ""}`,
        type: "income",
        grossCents: input.amountCents,
        feeCents,
        netCents,
        paymentMethod: input.paymentMethod,
        transactedAt: input.performedAt,
      });
      const config = performedBy
        ? await this.commissionRepo.findActiveByOrgAndUser(
            input.orgId,
            performedBy,
          )
        : null;
      const { baseCents, commissionCents } = computeCommission(
        input.amountCents,
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
    }

    const fresh = await this.serviceRepo.findById(service.id, input.orgId);
    return fresh ?? service;
  }
}
