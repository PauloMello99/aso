import { Inject, Injectable } from "@nestjs/common";
import { PaymentFeeEntity } from "../../domain/payment-fee.entity";
import {
  IPaymentFeeRepository,
  PAYMENT_FEE_REPOSITORY,
} from "../../domain/payment-fee.repository.interface";

@Injectable()
export class GetPaymentFeesUseCase {
  constructor(
    @Inject(PAYMENT_FEE_REPOSITORY)
    private readonly feeRepo: IPaymentFeeRepository,
  ) {}

  async execute(orgId: string): Promise<PaymentFeeEntity[]> {
    return this.feeRepo.findByOrg(orgId);
  }
}
