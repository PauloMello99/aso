import { Inject, Injectable } from "@nestjs/common";
import {
  CUSTOMER_ORIGIN_REPOSITORY,
  CustomerOriginDto,
  ICustomerOriginRepository,
} from "../../domain/customer-origin.repository.interface";

@Injectable()
export class ListCustomerOriginsUseCase {
  constructor(
    @Inject(CUSTOMER_ORIGIN_REPOSITORY)
    private readonly repo: ICustomerOriginRepository,
  ) {}

  execute(orgId: string): Promise<CustomerOriginDto[]> {
    return this.repo.findByOrg(orgId);
  }
}
