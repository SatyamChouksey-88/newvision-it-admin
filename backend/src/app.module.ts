import { Module } from '@nestjs/common';
import { SentryModule } from '@sentry/nestjs/setup';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AccessoriesModule } from './accessories/accessories.module';
import { AuditCyclesModule } from './audit-cycles/audit-cycles.module';
import { AssetRequestsModule } from './asset-requests/asset-requests.module';
import { AssetsModule } from './assets/assets.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { EntraModule } from './auth/entra/entra.module';
import { CategoriesModule } from './categories/categories.module';
import { ClientsModule } from './clients/clients.module';
import { ChatModule } from './chat/chat.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CustomRolesModule } from './custom-roles/custom-roles.module';
import { ConsumablesModule } from './consumables/consumables.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DepartmentsModule } from './departments/departments.module';
import { EmployeesModule } from './employees/employees.module';
import { FeedbackModule } from './feedback/feedback.module';
import { HealthModule } from './health/health.module';
import { InternalCronModule } from './internal/internal-cron.module';
import { ImportExportModule } from './import-export/import-export.module';
import { ImportJobsModule } from './import-jobs/import-jobs.module';
import { LocationsModule } from './locations/locations.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { NotesModule } from './notes/notes.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RbacModule } from './common/rbac/rbac.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProcurementModule } from './procurement/procurement.module';
import { QrModule } from './qr/qr.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { RecordsModule } from './records/records.module';
import { ReportsModule } from './reports/reports.module';
import { SavedViewsModule } from './saved-views/saved-views.module';
import { SearchModule } from './search/search.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { TicketsModule } from './tickets/tickets.module';
import { UsersModule } from './users/users.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ModulesGuard } from './tenancy/modules.guard';
import { TenantInterceptor } from './tenancy/tenant.interceptor';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RbacModule,
    TenancyModule,
    AuditModule,
    AuthModule,
    EntraModule,
    HealthModule,
    InternalCronModule,
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
    AuditCyclesModule,
    ClientsModule,
    MaintenanceModule,
    NotificationsModule,
    ReportsModule,
    QrModule,
    WebhooksModule,
    TicketsModule,
    NotesModule,
    RecordsModule,
    UsersModule,
    CustomRolesModule,
    FeedbackModule,
    ChatModule,
    ProcurementModule,
  ],
  providers: [
    // Order matters: authenticate first, then check roles. Both run globally.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ModulesGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
  ],
})
export class AppModule {}
