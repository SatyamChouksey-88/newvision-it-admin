import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContractsController, ProcurementController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { ProcurementLogService } from './log.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { RequisitionsController } from './requisitions.controller';
import { RequisitionsService } from './requisitions.service';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [
    VendorsController,
    RequisitionsController,
    PurchaseOrdersController,
    ContractsController,
    ProcurementController,
  ],
  providers: [
    ProcurementLogService,
    VendorsService,
    RequisitionsService,
    PurchaseOrdersService,
    ContractsService,
  ],
  exports: [VendorsService, RequisitionsService, PurchaseOrdersService, ContractsService],
})
export class ProcurementModule {}
