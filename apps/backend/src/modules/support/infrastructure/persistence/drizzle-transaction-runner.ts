import { Inject, Injectable } from "@nestjs/common";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import {
  ITransactionRunner,
  TransactionContext,
} from "../../domain/ports/transaction-runner.port";

@Injectable()
export class DrizzleTransactionRunner implements ITransactionRunner {
  constructor(@Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB) {}

  run<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return this.admin.transaction((tx) =>
      fn(tx as unknown as TransactionContext),
    );
  }
}
