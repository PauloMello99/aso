import { Inject, Injectable } from "@nestjs/common";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../organizations/domain/member.repository.interface";
import { OrgForbiddenException } from "../../organizations/domain/exceptions/org-forbidden.exception";
import { hasModuleAccess } from "../../organizations/domain/member-permissions";
import { ListServicesUseCase } from "../../services/application/use-cases/list-services.use-case";
import {
  ListTransactionsUseCase,
  type TransactionView,
} from "../../cashier/application/use-cases/list-transactions.use-case";
import { ListTransactionCategoriesUseCase } from "../../cashier/application/use-cases/list-transaction-categories.use-case";
import {
  ListMaterialsUseCase,
  type MaterialListItemView,
} from "../../materials/application/use-cases/list-materials.use-case";
import { ListCalendarEventsUseCase } from "../../calendar/application/use-cases/list-calendar-events.use-case";
import { ListCustomersUseCase } from "../../customers/application/use-cases/list-customers.use-case";
import type { ServiceEntity } from "../../services/domain/service.entity";
import type { CalendarEventEntity } from "../../calendar/domain/calendar-event.entity";
import type { CustomerEntity } from "../../customers/domain/customer.entity";
import type { TransactionCategoryEntity } from "../../cashier/domain/transaction-category.entity";

const LIMITS = {
  services: 10,
  events: 10,
  lowStock: 20,
  transactions: 10,
  customers: 10,
} as const;

const UPCOMING_WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface OverviewResult {
  recentServices?: ServiceEntity[];
  upcomingEvents?: CalendarEventEntity[];
  lowStock?: MaterialListItemView[];
  recentTransactions?: TransactionView[];
  transactionCategories?: TransactionCategoryEntity[];
  recentCustomers?: CustomerEntity[];
}

@Injectable()
export class GetOverviewUseCase {
  constructor(
    @Inject(MEMBER_REPOSITORY) private readonly memberRepo: IMemberRepository,
    private readonly listServices: ListServicesUseCase,
    private readonly listTransactions: ListTransactionsUseCase,
    private readonly listCategories: ListTransactionCategoriesUseCase,
    private readonly listMaterials: ListMaterialsUseCase,
    private readonly listEvents: ListCalendarEventsUseCase,
    private readonly listCustomers: ListCustomersUseCase,
  ) {}

  async execute(orgId: string, authId: string): Promise<OverviewResult> {
    const member = await this.memberRepo.findByAuthId(orgId, authId);
    if (!member) throw new OrgForbiddenException();

    const permissions = member.permissions;
    const canServices = hasModuleAccess(member.role, permissions, "services");
    const canSchedule = hasModuleAccess(member.role, permissions, "schedule");
    const canStock = hasModuleAccess(member.role, permissions, "stock");
    const canCashier = hasModuleAccess(member.role, permissions, "cashier");
    const canClients = hasModuleAccess(member.role, permissions, "clients");

    const now = new Date();
    const windowEnd = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * DAY_MS);
    const nowMs = now.getTime();

    const result: OverviewResult = {};
    const tasks: Promise<void>[] = [];

    if (canServices) {
      tasks.push(
        this.listServices.execute({ orgId, authId }).then((services) => {
          result.recentServices = [...services]
            .sort((a, b) => +b.performedAt - +a.performedAt)
            .slice(0, LIMITS.services);
        }),
      );
    }

    if (canSchedule) {
      tasks.push(
        this.listEvents
          .execute({ orgId, authId, start: now, end: windowEnd })
          .then((events) => {
            result.upcomingEvents = events
              .filter((e) => e.status !== "canceled" && +e.endsAt >= nowMs)
              .sort((a, b) => +a.startsAt - +b.startsAt)
              .slice(0, LIMITS.events);
          }),
      );
    }

    if (canStock) {
      tasks.push(
        this.listMaterials
          .execute(orgId, { lowStockOnly: true }, authId)
          .then((materials) => {
            result.lowStock = materials.slice(0, LIMITS.lowStock);
          }),
      );
    }

    if (canCashier) {
      tasks.push(
        this.listTransactions.execute({ orgId, authId }).then((transactions) => {
          result.recentTransactions = [...transactions]
            .sort((a, b) => +b.entity.transactedAt - +a.entity.transactedAt)
            .slice(0, LIMITS.transactions);
        }),
      );
      tasks.push(
        this.listCategories.execute(orgId).then((categories) => {
          result.transactionCategories = categories;
        }),
      );
    }

    if (canClients) {
      tasks.push(
        this.listCustomers.execute(orgId).then((customers) => {
          result.recentCustomers = [...customers]
            .sort((a, b) => +b.createdAt - +a.createdAt)
            .slice(0, LIMITS.customers);
        }),
      );
    }

    await Promise.all(tasks);

    return result;
  }
}
