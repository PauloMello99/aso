import { Inject, Injectable } from "@nestjs/common";
import {
  CUSTOMER_REPOSITORY,
  ICustomerRepository,
} from "../../domain/customer.repository.interface";

const MAX_OPTIONS = 1000;

export interface CustomerOption {
  id: string;
  name: string;
}

export interface ListCustomerOptionsResult {
  data: CustomerOption[];
  truncated: boolean;
}

@Injectable()
export class ListCustomerOptionsUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: ICustomerRepository,
  ) {}

  async execute(orgId: string): Promise<ListCustomerOptionsResult> {
    const rows = await this.customerRepo.findOptionsByOrg(orgId, {
      enabledOnly: true,
      limit: MAX_OPTIONS,
    });

    if (rows.length > MAX_OPTIONS) {
      return { data: rows.slice(0, MAX_OPTIONS), truncated: true };
    }

    return { data: rows, truncated: false };
  }
}
