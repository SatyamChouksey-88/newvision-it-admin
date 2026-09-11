import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';
import { ContractsService } from './contracts.service';
import { CreateContractDto, UpdateContractDto } from './dto';

const ADMIN = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN] as const;

@ApiTags('vendor-contracts')
@Controller('vendor-contracts')
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Roles(...ADMIN)
  @Get()
  list(
    @Query() query: ListQuery & { type?: string; vendorId?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.contracts.list(query, user);
  }

  @Roles(...ADMIN, RoleName.IT_SUPPORT)
  @Get('for-asset/:assetId')
  forAsset(@Param('assetId', ParseIntPipe) assetId: number) {
    return this.contracts.coverageForAsset(assetId);
  }

  @Roles(...ADMIN)
  @Get(':id/history')
  history(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.contracts.history(id, user);
  }

  @Roles(...ADMIN)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.contracts.get(id, user);
  }

  @Roles(...ADMIN)
  @Post()
  create(@Body() dto: CreateContractDto, @CurrentUser() user: AuthUser) {
    return this.contracts.create(dto, user);
  }

  @Roles(...ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContractDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contracts.update(id, dto, user);
  }

  @Roles(...ADMIN)
  @Post(':id/renew')
  renew(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.contracts.renew(id, user);
  }
}

@ApiTags('procurement')
@Controller('procurement')
export class ProcurementController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contracts: ContractsService,
  ) {}

  @Roles(...ADMIN, RoleName.MANAGER)
  @Get('meta')
  meta() {
    return {
      categories: ['Hardware', 'Licenses/Software', 'Repair Services', 'Peripherals'],
      types: ['Hardware', 'Licenses', 'Services Procurement'],
      lineKinds: ['serialized', 'accessory', 'consumable', 'license'],
    };
  }

  @Roles(...ADMIN)
  @Get('approval-matrix')
  matrix() {
    return this.prisma.approvalMatrixRule.findMany({
      orderBy: [{ minAmount: 'asc' }, { level: 'asc' }],
    });
  }

  @Roles(...ADMIN)
  @Get('invoices')
  async invoices(@Query() query: ListQuery & { paymentStatus?: string }) {
    await this.prisma.vendorInvoice.updateMany({
      where: { paymentStatus: 'pending', dueDate: { lt: new Date() } },
      data: { paymentStatus: 'overdue' },
    });
    const { skip, take } = {
      skip: Number(query._start ?? 0),
      take: Math.min(Number(query._end ?? 25) - Number(query._start ?? 0) || 25, 200),
    };
    const where = {
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus as never } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.vendorInvoice.findMany({
        where,
        skip,
        take,
        orderBy: { dueDate: 'asc' },
        include: {
          vendor: { select: { legalName: true, vendorCode: true } },
          purchaseOrder: { select: { poNumber: true } },
        },
      }),
      this.prisma.vendorInvoice.count({ where }),
    ]);
    return { data, total };
  }

  @Roles(...ADMIN)
  @Get('summary')
  async summary() {
    const [openPr, overduePay, renewals, spend] = await Promise.all([
      this.prisma.purchaseRequisition.findMany({
        where: { status: 'pending_approval' },
        include: {
          approvers: {
            where: { kind: 'required', status: 'pending' },
            include: { user: { select: { fullName: true } } },
          },
        },
        take: 50,
      }),
      this.prisma.vendorInvoice.findMany({
        where: { paymentStatus: 'overdue' },
        include: { vendor: { select: { legalName: true } } },
        take: 50,
      }),
      this.prisma.vendorContract.findMany({
        where: { endDate: { lte: new Date(Date.now() + 90 * 86400000), gte: new Date() } },
        include: { vendor: { select: { legalName: true } } },
        orderBy: { endDate: 'asc' },
        take: 50,
      }),
      this.prisma.purchaseOrder.groupBy({
        by: ['vendorId'],
        _sum: { total: true },
        where: { status: { not: 'cancelled' } },
      }),
    ]);
    const vendors = await this.prisma.vendor.findMany({
      where: { id: { in: spend.map((s) => s.vendorId) } },
      select: { id: true, legalName: true, ratingSummary: true },
    });
    const vendorMap = new Map(vendors.map((v) => [v.id, v]));
    return {
      openRequisitions: openPr.map((p) => ({
        id: p.id,
        number: p.requisitionNumber,
        title: p.title,
        waitingOn: p.approvers.map((a) => a.user.fullName),
      })),
      overduePayments: overduePay,
      upcomingRenewals: renewals,
      spendByVendor: spend.map((s) => ({
        vendorId: s.vendorId,
        vendor: vendorMap.get(s.vendorId)?.legalName,
        total: s._sum.total,
        rating: vendorMap.get(s.vendorId)?.ratingSummary,
      })),
    };
  }

  @Roles(...ADMIN)
  @Post('renewal-check')
  runRenewals() {
    return this.contracts.runRenewalCheck();
  }
}
