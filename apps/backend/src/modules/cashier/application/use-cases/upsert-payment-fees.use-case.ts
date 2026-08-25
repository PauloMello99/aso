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
import { AuditService } from "../../../audit/audit.service";

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

@Injectable()
export class UpsertPaymentFeesUseCase {
  constructor(
    @Inject(PAYMENT_FEE_REPOSITORY)
    private readonly feeRepo: IPaymentFeeRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(input: UpsertPaymentFeesInput): Promise<PaymentFeeEntity[]> {
    const isOwner = await this.orgRepo.isOwner(input.orgId, input.authId);
    if (!isOwner) {
      throw new CashierForbiddenException(
        "Only organization owners can configure payment fees",
      );
    }

    const previousFees = await this.feeRepo.findByOrg(input.orgId);
    const previousByMethod = new Map(
      previousFees.map((fee) => [fee.paymentMethod, fee]),
    );

    const results: PaymentFeeEntity[] = [];
    const changes: Array<{
      paymentMethod: PaymentMethod;
      previousPercent: string | null;
      previousFixedCents: number | null;
      percent: string;
      fixedCents: number;
    }> = [];

    for (const fee of input.fees) {
      const previous = previousByMethod.get(fee.paymentMethod) ?? null;
      const unchanged =
        previous !== null &&
        Number.parseFloat(previous.percent) === Number.parseFloat(fee.percent) &&
        previous.fixedCents === fee.fixedCents;

      results.push(
        await this.feeRepo.upsert({
          orgId: input.orgId,
          paymentMethod: fee.paymentMethod,
          percent: fee.percent,
          fixedCents: fee.fixedCents,
        }),
      );

      if (!unchanged) {
        changes.push({
          paymentMethod: fee.paymentMethod,
          previousPercent: previous?.percent ?? null,
          previousFixedCents: previous?.fixedCents ?? null,
          percent: fee.percent,
          fixedCents: fee.fixedCents,
        });
      }
    }

    if (changes.length > 0) {
      await this.auditService.logByAuthId(input.authId, {
        orgId: input.orgId,
        action: "cashier_fees_updated",
        entityType: "payment_fees",
        entityId: input.orgId,
        metadata: { changes },
      });
    }

    return results;
  }
}
