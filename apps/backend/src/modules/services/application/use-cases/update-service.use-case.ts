import { Inject, Injectable } from "@nestjs/common";
import {
  IServiceRepository,
  SERVICE_REPOSITORY,
} from "../../domain/service.repository.interface";
import { ServiceEntity } from "../../domain/service.entity";
import {
  IServiceTypeRepository,
  SERVICE_TYPE_REPOSITORY,
} from "../../domain/service-type.repository.interface";
import {
  ICustomerRepository,
  CUSTOMER_REPOSITORY,
} from "../../../customers/domain/customer.repository.interface";
import type { CustomerEntity } from "../../../customers/domain/customer.entity";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { ServiceNotFoundException } from "../../domain/exceptions/service-not-found.exception";
import { ServiceAlreadyCanceledException } from "../../domain/exceptions/service-already-canceled.exception";
import { CustomerDisabledException } from "../../domain/exceptions/customer-disabled.exception";
import { ServiceForbiddenException } from "../../domain/exceptions/service-forbidden.exception";
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

export interface UpdateServiceInput {
  orgId: string;
  serviceId: string;
  authId: string;
  serviceTypeId?: string | null;
  customerId?: string | null;
  performedBy?: string | null;
  description?: string | null;
  anamnesisResponseId?: string | null;
  performedAt?: Date;
}

@Injectable()
export class UpdateServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
    @Inject(SERVICE_TYPE_REPOSITORY)
    private readonly serviceTypeRepo: IServiceTypeRepository,
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: ICustomerRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    @Inject(ANAMNESIS_RESPONSE_REPOSITORY)
    private readonly anamnesisResponseRepo: IAnamnesisResponseRepository,
    @Inject(ANAMNESIS_FORM_REPOSITORY)
    private readonly anamnesisFormRepo: IAnamnesisFormRepository,
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

    if (!isOwner && service.performedBy !== currentUserId) {
      throw new ServiceForbiddenException();
    }
    if (service.isCanceled) {
      throw new ServiceAlreadyCanceledException(input.serviceId);
    }

    assertPerformedAtNotFuture(input.performedAt);

    let customer: CustomerEntity | null = null;
    if (input.customerId) {
      customer = await this.customerRepo.findById(
        input.customerId,
        input.orgId,
      );
      if (!customer || !customer.enabled) {
        throw new CustomerDisabledException(input.customerId);
      }
    }

    const effectiveCustomerId =
      input.customerId !== undefined ? input.customerId : service.customerId;
    const effectiveServiceTypeId =
      input.serviceTypeId !== undefined
        ? input.serviceTypeId
        : service.serviceTypeId;
    const effectivePerformedAt = input.performedAt ?? service.performedAt;

    const effectiveCustomer =
      effectiveCustomerId && effectiveCustomerId === input.customerId
        ? customer
        : effectiveCustomerId
          ? await this.customerRepo.findById(effectiveCustomerId, input.orgId)
          : null;

    const effectiveServiceType = effectiveServiceTypeId
      ? await this.serviceTypeRepo.findById(effectiveServiceTypeId, input.orgId)
      : null;

    assertAgeVerification(
      effectiveServiceType,
      effectiveCustomer,
      effectivePerformedAt,
    );

    const effectiveAnamnesisResponseId =
      input.anamnesisResponseId !== undefined
        ? input.anamnesisResponseId
        : service.anamnesisResponseId;

    if (effectiveAnamnesisResponseId) {
      const skipVersionCheck =
        effectiveAnamnesisResponseId === service.anamnesisResponseId;
      await assertAnamnesisResponseLinkable(
        this.anamnesisResponseRepo,
        input.orgId,
        effectiveAnamnesisResponseId,
        effectiveCustomerId,
        effectiveServiceTypeId,
        this.anamnesisFormRepo,
        skipVersionCheck,
      );
    }

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
      anamnesisResponseId: input.anamnesisResponseId,
    });

    const fresh = await this.serviceRepo.findById(service.id, input.orgId);
    return fresh ?? service;
  }
}
