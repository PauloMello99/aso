// CRITICO: este repositorio injeta @Inject(DRIZZLE), NUNCA DRIZZLE_ADMIN. A
// dupla escrita (transacao do caixa + linha de org_member_payments, ADR-0026)
// depende de as duas escritas caírem na MESMA conexao do request
// (RlsContext.runWithClaims em database.module.ts:70-113): o BEGIN acontece no
// inicio do request e um db.transaction() aninhado dentro dele vira um
// SAVEPOINT via Proxy (database.module.ts:141-), preservando atomicidade
// sem tocar no BEGIN/COMMIT externo. DRIZZLE_ADMIN e outro pool inteiro, sem
// esse BEGIN aberto — troca-lo aqui faria a dupla escrita do
// CreateMemberPaymentUseCase (passo 6) deixar de ser atomica SILENCIOSAMENTE,
// sem quebrar nenhum teste (o insert isolado continua funcionando). O
// precedente de escrita privilegiada via DRIZZLE_ADMIN do ADR-0021 NAO se
// aplica a esta tabela: so o owner escreve em org_member_payments, entao nao
// ha a classe de problema (RLS bloqueando um ator legitimo) que motivou
// aquela excecao.
import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  CreateMemberPaymentData,
  MemberPaymentEntity,
} from "../../domain/member-payment.entity";
import {
  IMemberPaymentRepository,
  MemberPaymentWithMethod,
} from "../../domain/member-payment.repository.interface";
import { PaymentMethod } from "../../domain/transaction.entity";
import { MemberPaymentMapper } from "./member-payment.mapper";

@Injectable()
export class DrizzleMemberPaymentRepository implements IMemberPaymentRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(data: CreateMemberPaymentData): Promise<MemberPaymentEntity> {
    const [row] = await this.db
      .insert(schema.orgMemberPayments)
      .values({
        orgId: data.orgId,
        userId: data.userId,
        transactionId: data.transactionId,
        amountCents: data.amountCents,
        periodStart: data.periodStart ?? null,
        periodEnd: data.periodEnd ?? null,
        description: data.description ?? null,
        reversesPaymentId: data.reversesPaymentId ?? null,
        createdBy: data.createdBy ?? null,
      })
      .returning();
    return MemberPaymentMapper.toDomain(row!);
  }

  async findById(
    id: string,
    orgId: string,
  ): Promise<MemberPaymentEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.orgMemberPayments)
      .where(
        and(
          eq(schema.orgMemberPayments.id, id),
          eq(schema.orgMemberPayments.orgId, orgId),
        ),
      )
      .limit(1);
    return row ? MemberPaymentMapper.toDomain(row) : null;
  }

  // JOIN com transactions para trazer o payment_method REAL da transacao
  // vinculada (a linha de org_member_payments em si e agnostica ao metodo,
  // ADR-0026 §3 — ver doc-comment de MemberPaymentWithMethod). innerJoin
  // simples por transactionId, SEM filtro extra de org_id no join: a FK
  // composta (transaction_id, org_id) -> transactions(id, org_id) criada na
  // migration 0072 ja garante no banco que a transacao pertence a mesma org
  // do pagamento — inventar um `eq(transactions.orgId, orgId)` aqui seria
  // redundante, nao mais seguro.
  async findAllByOrgAndUser(
    orgId: string,
    userId: string,
  ): Promise<MemberPaymentWithMethod[]> {
    const rows = await this.db
      .select({
        id: schema.orgMemberPayments.id,
        orgId: schema.orgMemberPayments.orgId,
        userId: schema.orgMemberPayments.userId,
        transactionId: schema.orgMemberPayments.transactionId,
        amountCents: schema.orgMemberPayments.amountCents,
        periodStart: schema.orgMemberPayments.periodStart,
        periodEnd: schema.orgMemberPayments.periodEnd,
        description: schema.orgMemberPayments.description,
        reversesPaymentId: schema.orgMemberPayments.reversesPaymentId,
        createdBy: schema.orgMemberPayments.createdBy,
        createdAt: schema.orgMemberPayments.createdAt,
        paymentMethod: schema.transactions.paymentMethod,
      })
      .from(schema.orgMemberPayments)
      .innerJoin(
        schema.transactions,
        eq(schema.transactions.id, schema.orgMemberPayments.transactionId),
      )
      .where(
        and(
          eq(schema.orgMemberPayments.orgId, orgId),
          eq(schema.orgMemberPayments.userId, userId),
        ),
      )
      .orderBy(desc(schema.orgMemberPayments.createdAt));
    return rows.map((row) => ({
      entity: MemberPaymentMapper.toDomain(row),
      paymentMethod: row.paymentMethod as PaymentMethod,
    }));
  }

  async findReversedIds(orgId: string): Promise<Set<string>> {
    const rows = await this.db
      .select({ reverses: schema.orgMemberPayments.reversesPaymentId })
      .from(schema.orgMemberPayments)
      .where(
        and(
          eq(schema.orgMemberPayments.orgId, orgId),
          isNotNull(schema.orgMemberPayments.reversesPaymentId),
        ),
      );
    return new Set(
      rows.map((r) => r.reverses).filter((id): id is string => id !== null),
    );
  }

  // Formula por EXCLUSAO (ver doc-comment em member-payment.repository.
  // interface.ts): soma amount_cents das linhas que NAO sao um estorno
  // (reverses_payment_id IS NULL) e que NAO tem nenhum estorno apontando
  // para elas (NOT EXISTS). period_start/period_end nunca entram aqui — sao
  // metadado, o saldo e vitalicio (plano do Bloco 2, Decisoes de modelagem).
  // NOT EXISTS aqui NAO filtra por user_id de proposito (database-guardian):
  // a FK composta so garante integridade de org_id, nao de user_id, entao
  // filtrar subestimaria o saldo devido se um estorno nascer mal chaveado.
  // Depende da policy de SELECT em org_member_payments ser org-wide — se um
  // dia for estreitada para "funcionario so ve a propria linha", esta
  // formula precisa ser revisitada.
  async netPaidCents(orgId: string, userId: string): Promise<number> {
    const { rows } = await this.db.execute<{ net_cents: string }>(sql`
      SELECT COALESCE(SUM(p.amount_cents), 0)::bigint AS net_cents
      FROM org_member_payments p
      WHERE p.org_id = ${orgId}
        AND p.user_id = ${userId}
        AND p.reverses_payment_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM org_member_payments r
          WHERE r.reverses_payment_id = p.id
        )
    `);
    return Number(rows[0]?.net_cents ?? 0);
  }
}
