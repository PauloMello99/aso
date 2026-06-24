import { Inject, Injectable } from "@nestjs/common";
import {
  IServiceRepository,
  SERVICE_REPOSITORY,
} from "../../domain/service.repository.interface";
import { ServiceEntity } from "../../domain/service.entity";
import {
  ICustomerRepository,
  CUSTOMER_REPOSITORY,
} from "../../../customers/domain/customer.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { ServiceNotFoundException } from "../../domain/exceptions/service-not-found.exception";
import { ServiceAlreadyCanceledException } from "../../domain/exceptions/service-already-canceled.exception";
import { CustomerDisabledException } from "../../domain/exceptions/customer-disabled.exception";
import { ServiceForbiddenException } from "../../domain/exceptions/service-forbidden.exception";
import { resolvePerformer } from "./resolve-performer";
import { resolveMembership } from "./resolve-membership";

/**
 * Edita apenas campos **não-financeiros** do serviço. Valor, método e estoque
 * são imutáveis — para alterá-los, cancele (estorno) e recrie.
 */
export interface UpdateServiceInput {
  orgId: string;
  serviceId: string;
  authId: string;
  serviceTypeId?: string | null;
  customerId?: string | null;
  performedBy?: string | null;
  description?: string | null;
  performedAt?: Date;
}

@Injectable()
export class UpdateServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: ICustomerRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
  ) {}

  async execute(input: UpdateServiceInput): Promise<ServiceEntity> {
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

    // Funcionário só edita os próprios atendimentos.
    if (!isOwner && service.performedBy !== currentUserId) {
      throw new ServiceForbiddenException();
    }
    if (service.isCanceled) {
      throw new ServiceAlreadyCanceledException(input.serviceId);
    }

    if (input.customerId) {
      const customer = await this.customerRepo.findById(
        input.customerId,
        input.orgId,
      );
      if (!customer || !customer.enabled) {
        throw new CustomerDisabledException(input.customerId);
      }
    }

    // Profissional só muda se enviado; funcionário continua restrito a si.
    const performedBy =
      input.performedBy !== undefined
        ? await resolvePerformer(
            this.memberRepo,
            input.orgId,
            currentUserId,
            isOwner,
            input.performedBy,
          )
        : undefined;

    await this.serviceRepo.update(service.id, {
      serviceTypeId: input.serviceTypeId,
      customerId: input.customerId,
      performedBy,
      description: input.description,
      performedAt: input.performedAt,
    });

    const fresh = await this.serviceRepo.findById(service.id, input.orgId);
    return fresh ?? service;
  }
}
