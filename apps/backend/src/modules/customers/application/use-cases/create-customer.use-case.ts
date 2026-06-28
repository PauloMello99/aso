import { Inject, Injectable } from "@nestjs/common";
import {
  CreateCustomerData,
  CustomerEntity,
} from "../../domain/customer.entity";
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
    return this.customerRepo.create(data);
  }
}
