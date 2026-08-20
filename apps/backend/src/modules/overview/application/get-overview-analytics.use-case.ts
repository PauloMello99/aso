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
  ServiceGroupRow,
} from "../../services/domain/service.repository.interface";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
  type DailyBalancePoint,
  type IncomeExpensePoint,
  type PaymentMethodTotal,
} from "../../cashier/domain/transaction.repository.interface";
import type { ServiceEntity } from "../../services/domain/service.entity";

export interface KpiWithDelta {
  current: number;
  previous: number;
  deltaPercent: number | null;
}

export interface OverviewAnalytics {
  role: "owner" | "employee";
  from: string;
  to: string;
  servicesCount: KpiWithDelta;
  serviceRevenueCents: KpiWithDelta;
  avgTicketCents: KpiWithDelta;
  receitaCents?: KpiWithDelta;
  despesaCents?: KpiWithDelta;
  resultadoCents?: KpiWithDelta;
  newCustomersCount?: KpiWithDelta;
  margin?: {
    serviceRevenueCents: number;
    materialCostCents: number;
    profitCents: number;
    marginPercent: number;
  };
  series?: DailyBalancePoint[];
  servicesByType?: ServiceGroupRow[];
  revenueByProfessional?: ServiceGroupRow[];
  paymentMethods?: PaymentMethodTotal[];
  incomeExpenseSeries?: IncomeExpensePoint[];
  commissionCents?: KpiWithDelta;
}

interface CoreMetrics {
  receitaCents: number;
  despesaCents: number;
  resultadoCents: number;
  servicesCount: number;
  serviceRevenueCents: number;
  avgTicketCents: number;
  materialCostCents: number;
  profitCents: number;
  marginPercent: number;
  newCustomersCount: number;
}

function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function kpi(current: number, previous: number): KpiWithDelta {
  return { current, previous, deltaPercent: deltaPercent(current, previous) };
}

function serviceStats(services: ServiceEntity[]): {
  count: number;
  revenueCents: number;
  avgTicketCents: number;
} {
  const active = services.filter((s) => !s.isCanceled);
  const count = active.length;
  const revenueCents = active.reduce((acc, s) => acc + s.amountCents, 0);
  return {
    count,
    revenueCents,
    avgTicketCents: count ? Math.round(revenueCents / count) : 0,
  };
}

@Injectable()
export class GetOverviewAnalyticsUseCase {
  constructor(
    @Inject(MEMBER_REPOSITORY) private readonly memberRepo: IMemberRepository,
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
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
    if (!member) throw new OrgForbiddenException();
    const isOwner = member.role === "owner";

    const len = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - len);

    const base = { from: from.toISOString(), to: to.toISOString() };

    if (!isOwner) {
      const [cur, prev, curCommissionCents, prevCommissionCents] =
        await Promise.all([
          this.listServices.execute({ orgId, authId, filter: { from, to } }),
          this.listServices.execute({
            orgId,
            authId,
            filter: { from: prevFrom, to: prevTo },
          }),
          this.serviceRepo.commissionCentsByPeriod(
            orgId,
            from,
            to,
            member.userId,
          ),
          this.serviceRepo.commissionCentsByPeriod(
            orgId,
            prevFrom,
            prevTo,
            member.userId,
          ),
        ]);
      const c = serviceStats(cur);
      const p = serviceStats(prev);
      return {
        role: "employee",
        ...base,
        servicesCount: kpi(c.count, p.count),
        serviceRevenueCents: kpi(c.revenueCents, p.revenueCents),
        avgTicketCents: kpi(c.avgTicketCents, p.avgTicketCents),
        commissionCents: kpi(curCommissionCents, prevCommissionCents),
      };
    }

    const [
      cur,
      prev,
      series,
      byType,
      byProfessional,
      paymentMethods,
      incExp,
      curCommissionCents,
      prevCommissionCents,
    ] = await Promise.all([
      this.computeCore(orgId, authId, from, to),
      this.computeCore(orgId, authId, prevFrom, prevTo),
      this.getBalanceHistory.execute(orgId, authId, from, to),
      this.serviceRepo.countAndRevenueByType(orgId, from, to),
      this.serviceRepo.countAndRevenueByProfessional(orgId, from, to),
      this.transactionRepo.incomeByPaymentMethod(orgId, from, to),
      this.transactionRepo.incomeExpenseSeries(orgId, from, to),
      this.serviceRepo.commissionCentsByPeriod(orgId, from, to, null),
      this.serviceRepo.commissionCentsByPeriod(orgId, prevFrom, prevTo, null),
    ]);

    return {
      role: "owner",
      ...base,
      servicesCount: kpi(cur.servicesCount, prev.servicesCount),
      serviceRevenueCents: kpi(cur.serviceRevenueCents, prev.serviceRevenueCents),
      avgTicketCents: kpi(cur.avgTicketCents, prev.avgTicketCents),
      receitaCents: kpi(cur.receitaCents, prev.receitaCents),
      despesaCents: kpi(cur.despesaCents, prev.despesaCents),
      resultadoCents: kpi(cur.resultadoCents, prev.resultadoCents),
      newCustomersCount: kpi(cur.newCustomersCount, prev.newCustomersCount),
      margin: {
        serviceRevenueCents: cur.serviceRevenueCents,
        materialCostCents: cur.materialCostCents,
        profitCents: cur.profitCents,
        marginPercent: cur.marginPercent,
      },
      series,
      servicesByType: byType,
      revenueByProfessional: byProfessional,
      paymentMethods,
      incomeExpenseSeries: incExp,
      commissionCents: kpi(curCommissionCents, prevCommissionCents),
    };
  }

  private async computeCore(
    orgId: string,
    authId: string,
    from: Date,
    to: Date,
  ): Promise<CoreMetrics> {
    const [transactions, services, customers, materialCostCents] =
      await Promise.all([
        this.listTransactions.execute({ orgId, authId, filter: { from, to } }),
        this.listServices.execute({ orgId, authId, filter: { from, to } }),
        this.listCustomers.execute(orgId),
        this.serviceRepo.materialCostCentsByPeriod(orgId, from, to),
      ]);

    let receitaCents = 0;
    let despesaCents = 0;
    for (const { entity } of transactions) {
      if (entity.type === "income") receitaCents += entity.netCents;
      else despesaCents += entity.netCents;
    }

    const stats = serviceStats(services);
    const profitCents = stats.revenueCents - materialCostCents;
    const marginPercent = stats.revenueCents
      ? Math.round((profitCents / stats.revenueCents) * 1000) / 10
      : 0;

    const fromMs = from.getTime();
    const toMs = to.getTime();
    const newCustomersCount = customers.filter((c) => {
      const t = c.createdAt.getTime();
      return t >= fromMs && t <= toMs;
    }).length;

    return {
      receitaCents,
      despesaCents,
      resultadoCents: receitaCents - despesaCents,
      servicesCount: stats.count,
      serviceRevenueCents: stats.revenueCents,
      avgTicketCents: stats.avgTicketCents,
      materialCostCents,
      profitCents,
      marginPercent,
      newCustomersCount,
    };
  }
}
