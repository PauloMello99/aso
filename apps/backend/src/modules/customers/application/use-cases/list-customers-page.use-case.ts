import { Inject, Injectable } from "@nestjs/common";
import {
  buildPaginated,
  Paginated,
  resolvePageRequest,
} from "../../../../common/pagination/pagination";
import { CustomerEntity } from "../../domain/customer.entity";
import {
  CUSTOMER_REPOSITORY,
  ICustomerRepository,
  ListCustomersFilter,
} from "../../domain/customer.repository.interface";

const PAGINATION_BOUNDS = { defaultLimit: 50, maxLimit: 200 };

@Injectable()
export class ListCustomersPageUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: ICustomerRepository,
  ) {}

  async execute(
    orgId: string,
    filter?: ListCustomersFilter,
    page?: number,
    limit?: number,
  ): Promise<Paginated<CustomerEntity>> {
    const {
      page: resolvedPage,
      limit: resolvedLimit,
      offset,
    } = resolvePageRequest({ page, limit }, PAGINATION_BOUNDS);

    const { rows, total } = await this.customerRepo.findPageByOrg(
      orgId,
      filter,
      { limit: resolvedLimit, offset },
    );

    return buildPaginated(rows, total, resolvedPage, resolvedLimit);
  }
}
