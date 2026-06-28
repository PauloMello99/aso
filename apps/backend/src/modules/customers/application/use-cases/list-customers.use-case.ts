import { Inject, Injectable } from "@nestjs/common";
import { CustomerEntity } from "../../domain/customer.entity";
import {
  CUSTOMER_REPOSITORY,
  ICustomerRepository,
  ListCustomersFilter,
} from "../../domain/customer.repository.interface";

@Injectable()
export class ListCustomersUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: ICustomerRepository,
  ) {}

  async execute(
    orgId: string,
    filter?: ListCustomersFilter,
  ): Promise<CustomerEntity[]> {
    return this.customerRepo.findAllByOrg(orgId, filter);
  }
}
