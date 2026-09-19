import type { CampaignTrigger } from "./campaign-trigger";

export const CAMPAIGN_DELIVERY_REPORT_REPOSITORY = Symbol(
  "CAMPAIGN_DELIVERY_REPORT_REPOSITORY",
);

/**
 * Uma linha do relatório de entrega (log `campaign_sends` + dados do
 * destinatário). `customerName`/`customerEmail` vêm `null` quando o cliente
 * foi excluído (LGPD) depois do envio — a linha do log é preservada mesmo
 * assim (ver cabeçalho de `drizzle-campaign-delivery-report.repository`).
 */
export interface CampaignDeliveryReportRow {
  id: string;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  trigger: CampaignTrigger;
  status: "sent" | "failed" | "bounced";
  attempt: number;
  error: string | null;
  sentAt: Date | null;
  createdAt: Date;
}

export interface ICampaignDeliveryReportRepository {
  /**
   * Últimas `limit` linhas de `campaign_sends` da org, mais recentes primeiro
   * (`ORDER BY created_at DESC`). O `orgId` DEVE vir do parâmetro (path da
   * rota validado pelo guard), nunca ser inferido só pela RLS — a policy de
   * SELECT (migration 0076) é por linha e não escopa a organização: um dono
   * de mais de uma org veria linhas de todas elas se o filtro explícito
   * `WHERE org_id = :orgId` não estivesse na query.
   */
  findDeliveryReport(
    orgId: string,
    limit: number,
  ): Promise<CampaignDeliveryReportRow[]>;
}
