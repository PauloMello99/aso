import { Inject, Injectable } from "@nestjs/common";
import { CustomerEntity } from "../../domain/customer.entity";
import { CustomerNotFoundException } from "../../domain/exceptions/customer-not-found.exception";
import {
  CUSTOMER_REPOSITORY,
  ICustomerRepository,
} from "../../domain/customer.repository.interface";

@Injectable()
export class GetCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: ICustomerRepository,
  ) {}

  async execute(id: string, orgId: string): Promise<CustomerEntity> {
    const customer = await this.customerRepo.findById(id, orgId);
    if (!customer) throw new CustomerNotFoundException(id);

    return customer;
  }
}
