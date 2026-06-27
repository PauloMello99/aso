import { Inject, Injectable } from "@nestjs/common";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../organizations/domain/member.repository.interface";
import { OrgForbiddenException } from "../../organizations/domain/exceptions/org-forbidden.exception";
import { ListServicesUseCase } from "../../services/application/use-cases/list-services.use-case";
import {
  ListTransactionsUseCase,
  type TransactionView,
} from "../../cashier/application/use-cases/list-transactions.use-case";
import { ListTransactionCategoriesUseCase } from "../../cashier/application/use-cases/list-transaction-categories.use-case";
import { ListMaterialsUseCase } from "../../materials/application/use-cases/list-materials.use-case";
import { ListCalendarEventsUseCase } from "../../calendar/application/use-cases/list-calendar-events.use-case";
import { ListCustomersUseCase } from "../../customers/application/use-cases/list-customers.use-case";
import type { ServiceEntity } from "../../services/domain/service.entity";
import type { MaterialEntity } from "../../materials/domain/material.entity";
import type { CalendarEventEntity } from "../../calendar/domain/calendar-event.entity";
import type { CustomerEntity } from "../../customers/domain/customer.entity";
import type { TransactionCategoryEntity } from "../../cashier/domain/transaction-category.entity";

/** Limites por seção — espelham o que o Overview já renderizava no cliente. */
const LIMITS = {
  services: 10,
  events: 10,
  lowStock: 20,
  transactions: 10,
  customers: 10,
} as const;

/** Janela de eventos futuros considerada (em dias). */
const UPCOMING_WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface OverviewResult {
  recentServices: ServiceEntity[];
  upcomingEvents: CalendarEventEntity[];
  lowStock: MaterialEntity[];
  /** Owner-only — funcionário recebe lista vazia. */
  recentTransactions: TransactionView[];
  transactionCategories: TransactionCategoryEntity[];
  recentCustomers: CustomerEntity[];
}

/**
 * Agrega num único request as seções do Overview, com scoping no servidor:
 * - funcionário enxerga só os próprios serviços/eventos (reusa os list use-cases);
 * - seções owner-only (transações, categorias, clientes) saem vazias p/ funcionário.
 * Substitui os ~6 requests que o cliente fazia, fatiando no front (PERF-2).
 */
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
    const isOwner = member.role === "owner";

    const now = new Date();
    const windowEnd = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * DAY_MS);

    const [services, events, materials] = await Promise.all([
      this.listServices.execute({ orgId, authId }),
      this.listEvents.execute({ orgId, authId, start: now, end: windowEnd }),
      this.listMaterials.execute(orgId, { lowStockOnly: true }),
    ]);

    const recentServices = [...services]
      .sort((a, b) => +b.performedAt - +a.performedAt)
      .slice(0, LIMITS.services);

    const nowMs = now.getTime();
    const upcomingEvents = events
      .filter((e) => e.status !== "canceled" && +e.endsAt >= nowMs)
      .sort((a, b) => +a.startsAt - +b.startsAt)
      .slice(0, LIMITS.events);

    const lowStock = materials.slice(0, LIMITS.lowStock);

    // Seções exclusivas do owner.
    let recentTransactions: TransactionView[] = [];
    let transactionCategories: TransactionCategoryEntity[] = [];
    let recentCustomers: CustomerEntity[] = [];

    if (isOwner) {
      const [transactions, categories, customers] = await Promise.all([
        this.listTransactions.execute({ orgId, authId }),
        this.listCategories.execute(orgId),
        this.listCustomers.execute(orgId),
      ]);

      recentTransactions = [...transactions]
        .sort(
          (a, b) => +b.entity.transactedAt - +a.entity.transactedAt,
        )
        .slice(0, LIMITS.transactions);
      transactionCategories = categories;
      recentCustomers = [...customers]
        .sort((a, b) => +b.createdAt - +a.createdAt)
        .slice(0, LIMITS.customers);
    }

    return {
      recentServices,
      upcomingEvents,
      lowStock,
      recentTransactions,
      transactionCategories,
      recentCustomers,
    };
  }
}
