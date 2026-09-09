import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AccessoriesModule } from './accessories/accessories.module';
import { AssetRequestsModule } from './asset-requests/asset-requests.module';
import { AssetsModule } from './assets/assets.module';
import { ConsumablesModule } from './consumables/consumables.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { DashboardModule } from './dashboard/dashboard.module';
import { DepartmentsModule } from './departments/departments.module';
import { EmployeesModule } from './employees/employees.module';
import { ImportExportModule } from './import-export/import-export.module';
import { ImportJobsModule } from './import-jobs/import-jobs.module';
import { LocationsModule } from './locations/locations.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { QrModule } from './qr/qr.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { ReportsModule } from './reports/reports.module';
import { SavedViewsModule } from './saved-views/saved-views.module';
import { SearchModule } from './search/search.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    AuthModule,
    LocationsModule,
    DepartmentsModule,
    CategoriesModule,
    EmployeesModule,
    AssetsModule,
    AssetRequestsModule,
    AccessoriesModule,
    ConsumablesModule,
    DashboardModule,
    SearchModule,
    ImportExportModule,
    ImportJobsModule,
    SavedViewsModule,
    ReconciliationModule,
    MaintenanceModule,
    NotificationsModule,
    ReportsModule,
    QrModule,
    WebhooksModule,
  ],
  providers: [
    // Order matters: authenticate first, then check roles. Both run globally.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
