import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import type { Response } from 'express';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListQuery } from '../common/query';
import { AmendPoDto, CreateInvoiceDto, InvoicePaymentDto, ReasonDto, ReceiveDto } from './dto';
import { PurchaseOrdersService } from './purchase-orders.service';

const ADMIN = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN] as const;

@ApiTags('purchase-orders')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly orders: PurchaseOrdersService) {}

  @Roles(...ADMIN)
  @Get()
  list(@Query() query: ListQuery & { status?: string }, @CurrentUser() user: AuthUser) {
    return this.orders.list(query, user);
  }

  @Roles(...ADMIN)
  @Get(':id/pdf')
  async pdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const buffer = await this.orders.pdf(id, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="po-${id}.pdf"`);
    res.send(buffer);
  }

  @Roles(...ADMIN)
  @Get(':id/history')
  history(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.orders.history(id, user);
  }

  @Roles(...ADMIN)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.orders.get(id, user);
  }

  @Roles(...ADMIN)
  @Post('from-requisition/:requisitionId')
  convert(
    @Param('requisitionId', ParseIntPipe) requisitionId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.convert(requisitionId, user);
  }

  @Roles(...ADMIN)
  @HttpCode(200)
  @Post(':id/send')
  send(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.orders.send(id, user);
  }

  @Roles(...ADMIN)
  @Post(':id/amend')
  amend(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AmendPoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.amend(id, dto, user);
  }

  @Roles(...ADMIN)
  @HttpCode(200)
  @Post(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReasonDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.cancel(id, dto, user);
  }

  @Roles(...ADMIN)
  @HttpCode(200)
  @Post(':id/short-close')
  shortClose(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReasonDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.shortClose(id, dto, user);
  }

  @Roles(...ADMIN)
  @Post(':id/receipts')
  receive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReceiveDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.receive(id, dto, user);
  }

  @Roles(...ADMIN)
  @Post('receipts/:grnId/void')
  voidReceipt(
    @Param('grnId', ParseIntPipe) grnId: number,
    @Body() dto: ReasonDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.voidReceipt(grnId, dto, user);
  }

  @Roles(...ADMIN)
  @Post('invoices')
  invoice(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.orders.addInvoice(dto, user);
  }

  @Roles(...ADMIN)
  @Patch('invoices/:id/payment')
  payment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: InvoicePaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.setPayment(id, dto, user);
  }
}
