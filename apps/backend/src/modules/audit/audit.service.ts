import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  DRIZZLE_ADMIN,
  registerPostCommit,
  type DrizzleDB,
} from "../../database/database.module";
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
  | "anamnesis_invite_sent"
  | "customer_self_registration_invite_sent"
  | "customer_self_registered"
  | "customer_update_invite_sent"
  | "customer_self_updated";

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
    // Adiado para depois do COMMIT real da transacao do request: o INSERT
    // usa DRIZZLE_ADMIN (pool separado, autocommit imediato) e, se rodasse
    // aqui, gravaria o audit log mesmo que o request falhe/faca ROLLBACK
    // depois (ver GOTCHA em .memory/domain-rules.md, secao RLS). Fora de um
    // request, registerPostCommit executa imediatamente (mesmo comportamento
    // de sempre).
    registerPostCommit(async () => {
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
    });
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
