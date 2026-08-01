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
  ITransactionCategoryRepository,
  TRANSACTION_CATEGORY_REPOSITORY,
} from "../../../cashier/domain/transaction-category.repository.interface";
import { resolveReversalCategoryId } from "../../../cashier/domain/reversal-category";
import { ServiceNotFoundException } from "../../domain/exceptions/service-not-found.exception";
import { ServiceAlreadyCanceledException } from "../../domain/exceptions/service-already-canceled.exception";
import { ServiceForbiddenException } from "../../domain/exceptions/service-forbidden.exception";
import { resolveMembership } from "./resolve-membership";

export interface CancelServiceInput {
  orgId: string;
  serviceId: string;
  authId: string;
}

@Injectable()
export class CancelServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    @Inject(MATERIAL_REPOSITORY)
    private readonly materialRepo: IMaterialRepository,
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly movementRepo: IStockMovementRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    @Inject(TRANSACTION_CATEGORY_REPOSITORY)
    private readonly categoryRepo: ITransactionCategoryRepository,
  ) {}

  async execute(input: CancelServiceInput): Promise<ServiceEntity> {
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
    if (service.isCanceled) {
      throw new ServiceAlreadyCanceledException(input.serviceId);
    }

    await this.serviceRepo.markCanceled(service.id);

    if (service.paymentTransactionId) {
      const original = await this.transactionRepo.findById(
        service.paymentTransactionId,
        input.orgId,
      );
      if (original && !original.isReversal) {
        const existing = await this.transactionRepo.findReversalOf(original.id);
        if (!existing) {
          const categoryId = await resolveReversalCategoryId(
            this.categoryRepo,
            original.orgId,
          );
          await this.transactionRepo.create({
            orgId: original.orgId,
            createdBy: currentUserId,
            description: `Estorno: ${original.description}`,
            type: original.type === "income" ? "outcome" : "income",
            grossCents: original.grossCents,
            feeCents: original.feeCents,
            netCents: original.netCents,
            paymentMethod: original.paymentMethod,
            categoryId,
            reversesTransactionId: original.id,
          });
        }
      }
    }

    for (const line of service.materials) {
      const qty = line.quantity;
      await this.materialRepo.updateStockQuantity(line.materialId, qty);
      await this.movementRepo.create({
        orgId: input.orgId,
        materialId: line.materialId,
        type: "manual_adjustment",
        quantityDelta: qty,
        serviceId: service.id,
        note: "Devolução por cancelamento de serviço",
        createdBy: currentUserId,
      });
    }

    const fresh = await this.serviceRepo.findById(service.id, input.orgId);
    return fresh ?? service;
  }
}
