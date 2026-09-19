import { Inject, Injectable } from "@nestjs/common";
import {
  CAMPAIGN_DELIVERY_REPORT_REPOSITORY,
  type CampaignDeliveryReportRow,
  type ICampaignDeliveryReportRepository,
} from "../../domain/campaign-delivery-report.repository.interface";

const MAX_REPORT_ROWS = 200;

export interface CampaignDeliveryReportSummary {
  sent: number;
  failed: number;
  bounced: number;
}

export interface CampaignDeliveryReportResult {
  summary: CampaignDeliveryReportSummary;
  items: CampaignDeliveryReportRow[];
}

/**
 * Relatório de entrega de campanhas do dono da org (D-4.3). Sem
 * `DomainException`: lista vazia é um resultado válido, não um erro — o
 * `orgId` já chega validado pelo guard da rota (passo 11), não há caminho de
 * negócio que falhe aqui.
 */
@Injectable()
export class GetCampaignDeliveryReportUseCase {
  constructor(
    @Inject(CAMPAIGN_DELIVERY_REPORT_REPOSITORY)
    private readonly reportRepo: ICampaignDeliveryReportRepository,
  ) {}

  async execute(orgId: string): Promise<CampaignDeliveryReportResult> {
    const items = await this.reportRepo.findDeliveryReport(
      orgId,
      MAX_REPORT_ROWS,
    );

    const summary = items.reduce<CampaignDeliveryReportSummary>(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      { sent: 0, failed: 0, bounced: 0 },
    );

    return { summary, items };
  }
}
