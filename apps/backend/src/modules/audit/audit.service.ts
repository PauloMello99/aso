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
import { isActingAsSuperAdmin } from "../../common/request-context/acting-context";

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
  | "customer_self_updated"
  | "anamnesis_invite_resent"
  | "anamnesis_copy_sent"
  | "cashier_transaction_created"
  | "cashier_fees_updated"
  | "cashier_commissions_updated";

export interface AuditEntry {
  actorId: string | null;
  orgId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  actingAsSuperAdmin?: boolean;
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
    //
    // Captura sincrona e obrigatoria aqui, fora do hook: o hook so roda DEPOIS
    // do COMMIT real, quando o AsyncLocalStorage do acting-context ja pode ter
    // saido de escopo (ex.: request ja respondeu). Ler isActingAsSuperAdmin()
    // dentro do callback assinaria a acao com o contexto errado.
    const viaSuperAdmin = entry.actingAsSuperAdmin ?? isActingAsSuperAdmin();
    const metadata: Record<string, unknown> | null = viaSuperAdmin
      ? { ...(entry.metadata ?? {}), viaSuperAdmin: true }
      : (entry.metadata ?? null);
    registerPostCommit(async () => {
      try {
        await this.db.insert(schema.auditLogs).values({
          actorId: entry.actorId,
          orgId: entry.orgId ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          metadata,
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
