import { Inject, Injectable } from "@nestjs/common";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../../organizations/domain/org.repository.interface";
import { PaymentFeeEntity } from "../../domain/payment-fee.entity";
import { PaymentMethod } from "../../domain/transaction.entity";
import {
  IPaymentFeeRepository,
  PAYMENT_FEE_REPOSITORY,
} from "../../domain/payment-fee.repository.interface";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";

export interface UpsertPaymentFeeItem {
  paymentMethod: PaymentMethod;
  percent: string;
  fixedCents: number;
}

export interface UpsertPaymentFeesInput {
  orgId: string;
  authId: string;
  fees: UpsertPaymentFeeItem[];
}

/** Configuração de taxas é exclusiva de admins (owner/super_admin). */
@Injectable()
export class UpsertPaymentFeesUseCase {
  constructor(
    @Inject(PAYMENT_FEE_REPOSITORY)
    private readonly feeRepo: IPaymentFeeRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
  ) {}

  async execute(input: UpsertPaymentFeesInput): Promise<PaymentFeeEntity[]> {
    const isOwner = await this.orgRepo.isOwner(input.orgId, input.authId);
    if (!isOwner) {
      throw new CashierForbiddenException(
        "Only organization owners can configure payment fees",
      );
    }

    const results: PaymentFeeEntity[] = [];
    for (const fee of input.fees) {
      results.push(
        await this.feeRepo.upsert({
          orgId: input.orgId,
          paymentMethod: fee.paymentMethod,
          percent: fee.percent,
          fixedCents: fee.fixedCents,
        }),
      );
    }
    return results;
  }
}
