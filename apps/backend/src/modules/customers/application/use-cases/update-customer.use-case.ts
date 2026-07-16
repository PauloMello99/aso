import { Inject, Injectable } from "@nestjs/common";
import {
  CustomerEntity,
  UpdateCustomerData,
} from "../../domain/customer.entity";
import { CustomerEmailAlreadyExistsException } from "../../domain/exceptions/customer-email-already-exists.exception";
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

    let email = data.email;
    if (data.email !== undefined) {
      if (data.email) {
        const conflicting = await this.customerRepo.findByEmail(
          orgId,
          data.email,
          id,
        );
        if (conflicting) {
          throw new CustomerEmailAlreadyExistsException(data.email);
        }
      }
      email = data.email?.trim() || null;
    }

    return this.customerRepo.update(id, { ...data, email });
  }
}
