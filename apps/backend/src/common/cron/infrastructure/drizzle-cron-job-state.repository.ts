import { Inject, Injectable } from "@nestjs/common";
import { lt } from "drizzle-orm";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../database/database.module";
import * as schema from "../../../database/schema";
import { ICronJobStateRepository } from "../cron-job-state.repository.interface";

@Injectable()
export class DrizzleCronJobStateRepository implements ICronJobStateRepository {
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async claimRun(
    jobName: string,
    at: Date,
    minIntervalMs: number,
  ): Promise<boolean> {
    const threshold = new Date(at.getTime() - minIntervalMs);
    // `setWhere` (not the deprecated ambiguous `where`) is required here: it
    // maps to the `DO UPDATE ... WHERE` predicate, which is what turns this
    // into an atomic claim. `targetWhere` would instead filter the conflict
    // target itself and would not protect against a concurrent claim.
    const rows = await this.db
      .insert(schema.cronJobState)
      .values({ jobName, lastRunAt: at })
      .onConflictDoUpdate({
        target: schema.cronJobState.jobName,
        set: { lastRunAt: at, updatedAt: at },
        setWhere: lt(schema.cronJobState.lastRunAt, threshold),
      })
      .returning({ jobName: schema.cronJobState.jobName });

    return rows.length > 0;
  }
}
