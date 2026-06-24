import { Inject, Injectable } from "@nestjs/common";
import { CustomerNotFoundException } from "../../domain/exceptions/customer-not-found.exception";
import {
  CUSTOMER_REPOSITORY,
  ICustomerRepository,
} from "../../domain/customer.repository.interface";

@Injectable()
export class DeleteCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: ICustomerRepository,
  ) {}

  async execute(id: string, orgId: string): Promise<void> {
    const existing = await this.customerRepo.findById(id, orgId);
    if (!existing) throw new CustomerNotFoundException(id);
    await this.customerRepo.delete(id, orgId);
  }
}
