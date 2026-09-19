// Injeta DRIZZLE (não DRIZZLE_ADMIN) DE PROPÓSITO: este repositório serve o
// relatório de entrega do DONO da org, que roda no contexto do request — sob
// ADR-0005 é o pool correto para respeitar RLS. É SEPARADO do
// DrizzleCampaignSendRepository (injeta DRIZZLE_ADMIN, serve o cron cross-org
// de campanhas, sem contexto de request) — misturar os dois pools na mesma
// classe é o gotcha do ADR-0005: usar DRIZZLE_ADMIN aqui vazaria linhas de
// TODAS as orgs por trás do relatório do dono; usar DRIZZLE no cron resolveria
// zero linhas sem erro (bug silencioso), já que o cron não tem claims de
// sessão para a RLS avaliar.
//
// A policy de SELECT da migration 0076 (`is_super_admin() OR
// is_org_owner(org_id)`) é avaliada POR LINHA e NÃO escopa a organização: um
// usuário dono de mais de uma org veria, só com a RLS, linhas de TODAS as
// orgs que possui. Por isso o `WHERE cs.org_id = $1` abaixo é OBRIGATÓRIO e
// explícito — a RLS aqui é defesa em profundidade, quem realmente escopa o
// relatório à organização da rota é este filtro.
import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type {
  CampaignDeliveryReportRow,
  ICampaignDeliveryReportRepository,
} from "../../domain/campaign-delivery-report.repository.interface";

@Injectable()
export class DrizzleCampaignDeliveryReportRepository
  implements ICampaignDeliveryReportRepository
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findDeliveryReport(
    orgId: string,
    limit: number,
  ): Promise<CampaignDeliveryReportRow[]> {
    // Query builder (não raw SQL, ao contrário de findRetriable no
    // DrizzleCampaignSendRepository — lá o raw SQL existe por causa de duas
    // anti-junções correlacionadas que não se expressam bem no builder; aqui
    // é um único LEFT JOIN simples) — os mapeadores de coluna do Drizzle
    // devolvem `Date` de verdade para sent_at/created_at (um `db.execute` com
    // sql`` cru bypassaria esses mapeadores e devolveria string, dependendo
    // do parser do driver).
    //
    // LEFT JOIN (não INNER): preserva a linha do log mesmo se o cliente foi
    // excluído por LGPD depois do envio, deixando o customer_id órfão —
    // customerName/customerEmail saem NULL nesse caso, mas a linha do
    // relatório continua aparecendo (log histórico, ver cabeçalho de
    // campaign_sends no schema). `customers.orgId = campaignSends.orgId` no
    // ON evita casar com um cliente de outra org que por acaso reaproveitasse
    // o mesmo uuid (nunca deveria acontecer, mas mantém a junção
    // corretamente escopada).
    //
    // `WHERE campaignSends.orgId = orgId` é OBRIGATÓRIO e explícito: a policy
    // de SELECT da migration 0076 (`is_super_admin() OR
    // is_org_owner(org_id)`) é avaliada POR LINHA e não escopa a organização
    // — um dono de mais de uma org veria, só com a RLS, linhas de todas elas.
    // A RLS aqui é defesa em profundidade; este filtro é o que realmente
    // escopa o relatório à org da rota.
    //
    // `ORDER BY created_at DESC LIMIT` usa o índice
    // campaign_sends_org_created_idx (migration 0063, (org_id, created_at
    // desc)) já existente — sem necessidade de índice novo.
    const rows = await this.db
      .select({
        id: schema.campaignSends.id,
        customerId: schema.campaignSends.customerId,
        customerName: schema.customers.name,
        customerEmail: schema.customers.email,
        trigger: schema.campaignSends.trigger,
        status: schema.campaignSends.status,
        attempt: schema.campaignSends.attempt,
        error: schema.campaignSends.error,
        sentAt: schema.campaignSends.sentAt,
        createdAt: schema.campaignSends.createdAt,
      })
      .from(schema.campaignSends)
      .leftJoin(
        schema.customers,
        and(
          eq(schema.customers.id, schema.campaignSends.customerId),
          eq(schema.customers.orgId, schema.campaignSends.orgId),
        ),
      )
      .where(eq(schema.campaignSends.orgId, orgId))
      .orderBy(desc(schema.campaignSends.createdAt))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      customerId: row.customerId,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      trigger: row.trigger,
      status: row.status,
      attempt: row.attempt,
      error: row.error,
      sentAt: row.sentAt,
      createdAt: row.createdAt,
    }));
  }
}
