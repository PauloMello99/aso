import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../database/database.module";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../user/domain/user.repository.interface";
import * as schema from "../../database/schema";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "invite_sent"
  | "invite_accepted"
  | "subscription_changed"
  | "anamnesis_invite_sent";

export interface AuditEntry {
  actorId: string | null;
  orgId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.db.insert(schema.auditLogs).values({
        actorId: entry.actorId,
        orgId: entry.orgId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: (entry.metadata ?? null) as Record<string, unknown> | null,
      });
    } catch (err) {
      this.logger.error(
        `Falha ao gravar audit log [${entry.action}:${entry.entityType}]: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async logByAuthId(
    authId: string | null,
    entry: Omit<AuditEntry, "actorId">,
  ): Promise<void> {
    let actorId: string | null = null;
    if (authId) {
      try {
        const user = await this.userRepo.findByAuthId(authId);
        actorId = user?.id ?? null;
      } catch {
        void 0;
      }
    }
    return this.log({ ...entry, actorId });
  }
}
