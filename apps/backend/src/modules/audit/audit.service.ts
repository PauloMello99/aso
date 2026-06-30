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
  | "subscription_changed";

export interface AuditEntry {
  actorId: string | null;
  orgId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Grava entradas em audit_logs. Usa DRIZZLE_ADMIN (BYPASSRLS) para garantir
 * que o write nunca seja bloqueado por RLS. Erros são logados mas nunca
 * propagados — a operação principal nunca deve falhar por causa da auditoria.
 */
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

  /**
   * Resolve o users.id a partir do authId (Supabase auth UUID) e chama log().
   * Útil para use-cases que só têm o authId disponível no momento da auditoria.
   */
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
        // Falha silenciosa — não bloqueia o log
      }
    }
    return this.log({ ...entry, actorId });
  }
}
