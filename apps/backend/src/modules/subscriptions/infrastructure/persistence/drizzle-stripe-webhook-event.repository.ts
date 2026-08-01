import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { IStripeWebhookEventRepository } from "../../domain/stripe-webhook-event.repository.interface";

@Injectable()
export class DrizzleStripeWebhookEventRepository
  implements IStripeWebhookEventRepository
{
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  /**
   * Claims the event for processing. A first-time delivery inserts the row
   * (claimed). A retried delivery of an event whose prior attempt threw
   * before `markProcessed` finds an existing row with `processed_at IS NULL`
   * — that also counts as claimed, so the retry actually reprocesses instead
   * of being silently swallowed as "already handled" (the row was inserted,
   * but the event was never finished).
   */
  async claim(id: string, type: string): Promise<boolean> {
    const inserted = await this.db
      .insert(schema.stripeWebhookEvents)
      .values({ id, type })
      .onConflictDoNothing()
      .returning({ id: schema.stripeWebhookEvents.id });
    if (inserted.length > 0) return true;

    const unprocessed = await this.db
      .select({ id: schema.stripeWebhookEvents.id })
      .from(schema.stripeWebhookEvents)
      .where(
        and(
          eq(schema.stripeWebhookEvents.id, id),
          isNull(schema.stripeWebhookEvents.processedAt),
        ),
      );
    return unprocessed.length > 0;
  }

  async markProcessed(id: string): Promise<void> {
    await this.db
      .update(schema.stripeWebhookEvents)
      .set({ processedAt: new Date() })
      .where(eq(schema.stripeWebhookEvents.id, id));
  }
}
