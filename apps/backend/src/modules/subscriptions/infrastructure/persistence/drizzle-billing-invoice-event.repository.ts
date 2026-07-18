import { Inject, Injectable } from "@nestjs/common";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  CreateBillingInvoiceEventData,
  IBillingInvoiceEventRepository,
} from "../../domain/billing-invoice-event.repository.interface";

@Injectable()
export class DrizzleBillingInvoiceEventRepository
  implements IBillingInvoiceEventRepository
{
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async create(data: CreateBillingInvoiceEventData): Promise<void> {
    await this.db
      .insert(schema.billingInvoiceEvents)
      .values({
        stripeInvoiceId: data.stripeInvoiceId,
        orgId: data.orgId ?? null,
        type: data.type,
        amountCents: data.amountCents,
        currency: data.currency,
        occurredAt: data.occurredAt,
      })
      .onConflictDoNothing({
        target: [
          schema.billingInvoiceEvents.stripeInvoiceId,
          schema.billingInvoiceEvents.type,
        ],
      });
  }
}
