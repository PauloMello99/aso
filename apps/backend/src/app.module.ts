import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { DatabaseModule } from "./database/database.module";
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: RlsInterceptor }],
})
export class AppModule {}
