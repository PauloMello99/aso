import { Inject, Injectable } from "@nestjs/common";
import {
  CustomerEntity,
  UpdateCustomerData,
} from "../../domain/customer.entity";
import { CustomerNotFoundException } from "../../domain/exceptions/customer-not-found.exception";
import {
  CUSTOMER_REPOSITORY,
  ICustomerRepository,
} from "../../domain/customer.repository.interface";

@Injectable()
export class UpdateCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: ICustomerRepository,
  ) {}

  async execute(
    id: string,
    orgId: string,
    data: UpdateCustomerData,
  ): Promise<CustomerEntity> {
    const existing = await this.customerRepo.findById(id, orgId);
    if (!existing) throw new CustomerNotFoundException(id);
    return this.customerRepo.update(id, data);
  }
}
