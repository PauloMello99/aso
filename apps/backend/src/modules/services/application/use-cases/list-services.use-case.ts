import { Inject, Injectable } from "@nestjs/common";
import {
  IServiceRepository,
  SERVICE_REPOSITORY,
  type ListServicesFilter,
} from "../../domain/service.repository.interface";
import { ServiceEntity } from "../../domain/service.entity";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { resolveMembership } from "./resolve-membership";

export interface ListServicesInput {
  orgId: string;
  authId: string;
  filter?: ListServicesFilter;
}

@Injectable()
export class ListServicesUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
  ) {}

  async execute(input: ListServicesInput): Promise<ServiceEntity[]> {
    const { userId: currentUserId, isOwner } = await resolveMembership(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    const filter: ListServicesFilter = { ...input.filter };

    // Funcionário só enxerga os próprios atendimentos (força performedBy=self).
    if (!isOwner) {
      filter.performedBy = currentUserId;
    }

    return this.serviceRepo.findAllByOrg(input.orgId, filter);
  }
}
