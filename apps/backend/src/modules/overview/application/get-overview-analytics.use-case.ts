import { Inject, Injectable } from "@nestjs/common";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../organizations/domain/member.repository.interface";
import { OrgForbiddenException } from "../../organizations/domain/exceptions/org-forbidden.exception";
import { ListTransactionsUseCase } from "../../cashier/application/use-cases/list-transactions.use-case";
import { ListServicesUseCase } from "../../services/application/use-cases/list-services.use-case";
import { ListCustomersUseCase } from "../../customers/application/use-cases/list-customers.use-case";
import { GetBalanceHistoryUseCase } from "../../cashier/application/use-cases/get-balance-history.use-case";
import {
  IServiceRepository,
  SERVICE_REPOSITORY,
} from "../../services/domain/service.repository.interface";
import type { DailyBalancePoint } from "../../cashier/domain/transaction.repository.interface";

export interface OverviewAnalytics {
  from: string;
  to: string;
  /** Entradas (income) líquidas no período, em centavos. */
  receitaCents: number;
  /** Saídas (outcome) líquidas no período, em centavos. */
  despesaCents: number;
  /** receita − despesa (estornos se anulam aqui). */
  resultadoCents: number;
  /** Serviços não cancelados no período. */
  servicesCount: number;
  /** Ticket médio dos serviços não cancelados (centavos). */
  avgTicketCents: number;
  /** Clientes criados no período. */
  newCustomersCount: number;
  /** Receita dos serviços não cancelados no período (= soma do valor lançado). */
  serviceRevenueCents: number;
  /** Custo dos materiais consumidos por esses serviços (RPT-3). */
  materialCostCents: number;
  /** Lucro estimado = receita de serviços − custo de material. */
  profitCents: number;
  /** Margem = lucro / receita de serviços (0–100), 0 quando sem receita. */
  marginPercent: number;
  /** Série diária de saldo (para o gráfico). */
  series: DailyBalancePoint[];
}

/**
 * Métricas analíticas do estúdio para o dashboard do dono (PERF-3). Owner-only:
 * funcionário recebe 403. Reusa os list use-cases + histórico de saldo, agregando
 * no servidor.
 */
@Injectable()
export class GetOverviewAnalyticsUseCase {
  constructor(
    @Inject(MEMBER_REPOSITORY) private readonly memberRepo: IMemberRepository,
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
    private readonly listTransactions: ListTransactionsUseCase,
    private readonly listServices: ListServicesUseCase,
    private readonly listCustomers: ListCustomersUseCase,
    private readonly getBalanceHistory: GetBalanceHistoryUseCase,
  ) {}

  async execute(
    orgId: string,
    authId: string,
    from: Date,
    to: Date,
  ): Promise<OverviewAnalytics> {
    const member = await this.memberRepo.findByAuthId(orgId, authId);
    if (!member || member.role !== "owner") throw new OrgForbiddenException();

    const [transactions, services, customers, series, materialCostCents] =
      await Promise.all([
        this.listTransactions.execute({ orgId, authId, filter: { from, to } }),
        this.listServices.execute({ orgId, authId, filter: { from, to } }),
        this.listCustomers.execute(orgId),
        this.getBalanceHistory.execute(orgId, authId, from, to),
        this.serviceRepo.materialCostCentsByPeriod(orgId, from, to),
      ]);

    let receitaCents = 0;
    let despesaCents = 0;
    for (const { entity } of transactions) {
      if (entity.type === "income") receitaCents += entity.netCents;
      else despesaCents += entity.netCents;
    }

    const active = services.filter((s) => !s.isCanceled);
    const servicesCount = active.length;
    const servicesSum = active.reduce((acc, s) => acc + s.amountCents, 0);
    const avgTicketCents = servicesCount
      ? Math.round(servicesSum / servicesCount)
      : 0;

    const profitCents = servicesSum - materialCostCents;
    const marginPercent = servicesSum
      ? Math.round((profitCents / servicesSum) * 1000) / 10
      : 0;

    const fromMs = from.getTime();
    const toMs = to.getTime();
    const newCustomersCount = customers.filter((c) => {
      const t = c.createdAt.getTime();
      return t >= fromMs && t <= toMs;
    }).length;

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      receitaCents,
      despesaCents,
      resultadoCents: receitaCents - despesaCents,
      servicesCount,
      avgTicketCents,
      newCustomersCount,
      serviceRevenueCents: servicesSum,
      materialCostCents,
      profitCents,
      marginPercent,
      series,
    };
  }
}
