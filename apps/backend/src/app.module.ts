import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { DatabaseModule } from "./database/database.module";
import { AppCacheModule } from "./common/cache/cache.module";
import { RlsInterceptor } from "./common/interceptors/rls.interceptor";
import { AuthModule } from "./modules/auth/auth.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { HealthModule } from "./modules/health/health.module";
import { MaterialsModule } from "./modules/materials/materials.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { CalendarModule } from "./modules/calendar/calendar.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { CashierModule } from "./modules/cashier/cashier.module";
import { ServicesModule } from "./modules/services/services.module";
import { OverviewModule } from "./modules/overview/overview.module";
import { AdminModule } from "./modules/admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate-limiting global (SEC-4): teto generoso por IP; endpoints sensíveis
    // (auth) sobrescrevem com limites menores via @Throttle no controller.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AppCacheModule,
    DatabaseModule,
    AuthModule,
    HealthModule,
    MaterialsModule,
    CustomersModule,
    OrganizationsModule,
    CalendarModule,
    NotificationsModule,
    CashierModule,
    ServicesModule,
    OverviewModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: RlsInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
