import { Inject, Injectable } from "@nestjs/common";
import {
  CreateCustomerData,
  CustomerEntity,
} from "../../domain/customer.entity";
import { CustomerEmailAlreadyExistsException } from "../../domain/exceptions/customer-email-already-exists.exception";
import {
  CUSTOMER_REPOSITORY,
  ICustomerRepository,
} from "../../domain/customer.repository.interface";

@Injectable()
export class CreateCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: ICustomerRepository,
  ) {}

  async execute(data: CreateCustomerData): Promise<CustomerEntity> {
    if (data.email) {
      const existing = await this.customerRepo.findByEmail(
        data.orgId,
        data.email,
      );
      if (existing) {
        throw new CustomerEmailAlreadyExistsException(data.email);
      }
    }

    return this.customerRepo.create({
      ...data,
      email: data.email.trim(),
    });
  }
}
