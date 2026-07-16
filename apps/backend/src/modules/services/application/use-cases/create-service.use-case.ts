import { Inject, Injectable } from "@nestjs/common";
import {
  IServiceRepository,
  SERVICE_REPOSITORY,
  type CreateServiceMaterialData,
} from "../../domain/service.repository.interface";
import { ServiceEntity, type PaymentMethod } from "../../domain/service.entity";
import {
  ICustomerRepository,
  CUSTOMER_REPOSITORY,
} from "../../../customers/domain/customer.repository.interface";
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
import { CustomerDisabledException } from "../../domain/exceptions/customer-disabled.exception";
import { MaterialNotFoundException } from "../../../materials/domain/exceptions/material-not-found.exception";
import { InsufficientStockException } from "../../../materials/domain/exceptions/insufficient-stock.exception";
import { ServiceMaterialRequiredException } from "../../domain/exceptions/service-material-required.exception";
import { resolvePerformer } from "./resolve-performer";
import { resolveMembership } from "./resolve-membership";
import { assertPerformedAtNotFuture } from "./assert-performed-at-not-future";

/** Linha de material no lançamento. */
export interface ServiceMaterialInput {
  materialId: string;
  /** Quantidade consumida (material não-compartilhável). */
  quantity?: number;
  /** "Acabou?" — material compartilhável: marca consumo de 1 embalagem. */
  finished?: boolean;
}

export interface CreateServiceInput {
  orgId: string;
  /** Auth id (Supabase) de quem está lançando. */
  authId: string;
  customerId?: string | null;
  serviceTypeId?: string | null;
  /** App users.id do profissional (só owner escolhe; funcionário força = self). */
  performedBy?: string | null;
  description?: string | null;
  amountCents: number;
  paymentMethod: PaymentMethod;
  /** "paid" gera transação líquida no caixa; "pending" não. */
  paymentStatus: "paid" | "pending";
  performedAt?: Date;
  materials: ServiceMaterialInput[];
}

@Injectable()
export class CreateServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
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
  ) {}

  async execute(input: CreateServiceInput): Promise<ServiceEntity> {
    assertPerformedAtNotFuture(input.performedAt);

    const { userId: currentUserId, isOwner } = await resolveMembership(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    // 1. Cliente da org e ativo.
    if (input.customerId) {
      const customer = await this.customerRepo.findById(
        input.customerId,
        input.orgId,
      );
      if (!customer) throw new CustomerDisabledException(input.customerId);
      if (!customer.enabled) {
        throw new CustomerDisabledException(input.customerId);
      }
    }

    // 2. Profissional: funcionário força self; owner escolhe (membro ativo).
    const performedBy = await resolvePerformer(
      this.memberRepo,
      input.orgId,
      currentUserId,
      isOwner,
      input.performedBy,
    );

    // 3. Resolver consumo de materiais (valida estoque antes de gravar).
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
        // Compartilhável: só consome se "acabou?" marcado (1 embalagem).
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

    // 4. Criar serviço + service_materials.
    const service = await this.serviceRepo.create(
      {
        orgId: input.orgId,
        serviceTypeId: input.serviceTypeId ?? null,
        customerId: input.customerId ?? null,
        performedBy,
        createdBy: currentUserId,
        description: input.description ?? null,
        amountCents: input.amountCents,
        paymentMethod: input.paymentMethod,
        performedAt: input.performedAt,
      },
      toRecord,
    );

    // 5. Baixar estoque (movimento + saldo + lastUsed).
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

    // 6. Pagamento à vista: transação líquida no caixa.
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
      await this.serviceRepo.setPaymentTransaction(service.id, tx.id);
    }

    // Re-ler para refletir materiais/nomes/transação anotados.
    const fresh = await this.serviceRepo.findById(service.id, input.orgId);
    return fresh ?? service;
  }
}
