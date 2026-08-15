import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  ClaimInboundEmailInput,
  IInboundEmailRepository,
  MarkInboundEmailProcessedResult,
} from "../../domain/inbound-email.repository.interface";
import { TransactionContext } from "../../domain/ports/transaction-runner.port";

@Injectable()
export class DrizzleInboundEmailRepository implements IInboundEmailRepository {
  constructor(@Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB) {}

  async claim(
    input: ClaimInboundEmailInput,
    tx: TransactionContext,
  ): Promise<boolean> {
    const db = tx as unknown as DrizzleDB;
    const rows = await db
      .insert(schema.supportInboundEmails)
      .values({
        emailId: input.emailId,
        messageId: input.messageId,
        fromEmail: input.fromEmail,
        toEmail: input.toEmail,
      })
      .onConflictDoNothing({ target: schema.supportInboundEmails.emailId })
      .returning({ id: schema.supportInboundEmails.id });
    return rows.length > 0;
  }

  async markProcessed(
    emailId: string,
    result: MarkInboundEmailProcessedResult,
    tx: TransactionContext,
  ): Promise<void> {
    const db = tx as unknown as DrizzleDB;
    await db
      .update(schema.supportInboundEmails)
      .set({
        ticketId: result.ticketId,
        responseId: result.responseId,
        outcome: result.outcome,
        processedAt: new Date(),
      })
      .where(eq(schema.supportInboundEmails.emailId, emailId));
  }
}
