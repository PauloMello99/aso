import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrgsInfrastructureModule } from "../organizations/infrastructure/orgs-infrastructure.module";
import { ServicesInfrastructureModule } from "../services/infrastructure/services-infrastructure.module";
import { CashierInfrastructureModule } from "../cashier/infrastructure/cashier-infrastructure.module";
import { MaterialsInfrastructureModule } from "../materials/infrastructure/materials-infrastructure.module";
import { CalendarInfrastructureModule } from "../calendar/infrastructure/calendar-infrastructure.module";
import { CustomersInfrastructureModule } from "../customers/infrastructure/customers-infrastructure.module";
import { ListServicesUseCase } from "../services/application/use-cases/list-services.use-case";
import { ListTransactionsUseCase } from "../cashier/application/use-cases/list-transactions.use-case";
import { ListTransactionCategoriesUseCase } from "../cashier/application/use-cases/list-transaction-categories.use-case";
import { ListMaterialsUseCase } from "../materials/application/use-cases/list-materials.use-case";
import { ListCalendarEventsUseCase } from "../calendar/application/use-cases/list-calendar-events.use-case";
import { ListCustomersUseCase } from "../customers/application/use-cases/list-customers.use-case";
import { GetBalanceHistoryUseCase } from "../cashier/application/use-cases/get-balance-history.use-case";
import { GetOverviewUseCase } from "./application/get-overview.use-case";
import { GetOverviewAnalyticsUseCase } from "./application/get-overview-analytics.use-case";
import { OverviewController } from "./interface/overview.controller";

@Module({
  imports: [
    AuthModule,
    OrgsInfrastructureModule,
    ServicesInfrastructureModule,
    CashierInfrastructureModule,
    MaterialsInfrastructureModule,
    CalendarInfrastructureModule,
    CustomersInfrastructureModule,
  ],
  controllers: [OverviewController],
  providers: [
    GetOverviewUseCase,
    GetOverviewAnalyticsUseCase,
    ListServicesUseCase,
    ListTransactionsUseCase,
    ListTransactionCategoriesUseCase,
    ListMaterialsUseCase,
    ListCalendarEventsUseCase,
    ListCustomersUseCase,
    GetBalanceHistoryUseCase,
  ],
})
export class OverviewModule {}
