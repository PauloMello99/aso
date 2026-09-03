import { Inject, Injectable } from "@nestjs/common";
import {
  buildPaginated,
  Paginated,
  resolvePageRequest,
} from "../../../../common/pagination/pagination";
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

const PAGINATION_BOUNDS = { defaultLimit: 50, maxLimit: 200 };

export interface ListServicesPageInput {
  orgId: string;
  authId: string;
  filter?: ListServicesFilter;
  page?: number;
  limit?: number;
}

@Injectable()
export class ListServicesPageUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
  ) {}

  async execute(
    input: ListServicesPageInput,
  ): Promise<Paginated<ServiceEntity>> {
    const { userId: currentUserId, isOwner } = await resolveMembership(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    const filter: ListServicesFilter = { ...input.filter };

    if (!isOwner) {
      filter.performedBy = currentUserId;
    }

    const { page, limit, offset } = resolvePageRequest(
      { page: input.page, limit: input.limit },
      PAGINATION_BOUNDS,
    );

    const { rows, total } = await this.serviceRepo.findPageByOrg(
      input.orgId,
      filter,
      { limit, offset },
    );

    return buildPaginated(rows, total, page, limit);
  }
}
