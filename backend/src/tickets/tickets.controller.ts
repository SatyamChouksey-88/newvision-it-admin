import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import type { Response } from 'express';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListQuery } from '../common/query';
import {
  AssignTicketDto,
  BulkAssignDto,
  BulkCloseDto,
  CannedDto,
  CategoryUpdateDto,
  CommentDto,
  CreateTicketDto,
  DuplicateDto,
  NotifyPrefDto,
  RateTicketDto,
  TemplateDto,
  TimeLogDto,
  TransitionTicketDto,
  WatcherDto,
} from './dto';
import { reportsToCsv, reportsToPdf, ticketsToCsv, ticketsToPdf } from './tickets.export';
import { TicketsService } from './tickets.service';

const ALL_ROLES = [
  RoleName.SUPER_ADMIN,
  RoleName.IT_ADMIN,
  RoleName.IT_SUPPORT,
  RoleName.MANAGER,
  RoleName.EMPLOYEE,
] as const;
const STAFF = [RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT] as const;

type Uploaded = { originalname: string; mimetype: string; size: number; buffer: Buffer };

@ApiTags('support-tickets')
@Controller()
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get('support-tickets')
  list(
    @Query()
    query: ListQuery & {
      status?: string;
      priority?: string;
      categoryId?: string;
      assignedToId?: string;
      overdue?: string;
      unassigned?: string;
      awaitingReply?: string;
      mine?: string;
      view?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.tickets.list(query, user);
  }

  @Get('support-tickets/counts')
  counts(@CurrentUser() user: AuthUser) {
    return this.tickets.counts(user);
  }

  @Roles(...STAFF)
  @Get('support-tickets/reports')
  reports(@Query('from') from?: string, @Query('to') to?: string) {
    return this.tickets.reports(from, to);
  }

  @Roles(...STAFF)
  @Get('support-tickets/export')
  async exportTickets(
    @Res() res: Response,
    @CurrentUser() user: AuthUser,
    @Query()
    query: ListQuery & { status?: string; priority?: string; categoryId?: string; view?: string; format?: string },
  ) {
    const rows = await this.tickets.exportRows(query, user);
    if (rows.length === 0) throw new BadRequestException('No tickets match the current filters');
    const fmt = query.format === 'pdf' ? 'pdf' : 'csv';
    const buf =
      fmt === 'pdf'
        ? await ticketsToPdf('Support tickets', rows)
        : await ticketsToCsv(rows);
    const nameBits = [query.status, query.view, query.priority].filter(Boolean).join('_');
    const filename = `tickets${nameBits ? `_${nameBits}` : ''}.${fmt}`;
    res.setHeader('X-Row-Count', String(rows.length));
    res.setHeader('Content-Type', fmt === 'pdf' ? 'application/pdf' : 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  }

  @Roles(...STAFF)
  @Get('support-tickets/reports/export')
  async exportReports(
    @Res() res: Response,
    @Query('format') format = 'csv',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const data = await this.tickets.reports(from, to);
    const fmt = format === 'pdf' ? 'pdf' : 'csv';
    if (fmt === 'pdf') {
      const lines = [
        `Average resolution (hours): ${data.avgResolutionHours}`,
        `Overdue open: ${data.overdueOpen}`,
        `Average satisfaction: ${data.avgSatisfaction ?? 'n/a'}`,
        '',
        'By status:',
        ...Object.entries(data.byStatus).map(([k, v]) => `  ${k}: ${v}`),
        '',
        'Closed per staff:',
        ...data.closedPerStaff.map((s) => `  ${s.name}: ${s.closed} closed, avg rating ${s.avgRating ?? 'n/a'}`),
      ];
      const buf = await reportsToPdf('Ticket reports', lines);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="ticket-reports.pdf"');
      res.send(buf);
      return;
    }
    const buf = await reportsToCsv([
      { title: 'By status', rows: Object.entries(data.byStatus).map(([status, count]) => ({ status, count })) },
      { title: 'By category', rows: data.byCategory },
      { title: 'By priority', rows: Object.entries(data.byPriority).map(([priority, count]) => ({ priority, count })) },
      { title: 'Closed per staff', rows: data.closedPerStaff },
      { title: 'Ratings', rows: data.ratingDistribution },
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ticket-reports.csv"');
    res.send(buf);
  }

  @Roles(...STAFF)
  @Get('support-tickets/staff')
  staff() {
    return this.tickets.listStaff();
  }

  @Get('ticket-categories')
  categories() {
    return this.tickets.listCategories();
  }

  @Roles(...STAFF)
  @Post('ticket-categories')
  upsertCategory(@Body() dto: CategoryUpdateDto, @CurrentUser() user: AuthUser) {
    return this.tickets.upsertCategory(dto, user);
  }

  @Roles(...STAFF)
  @Get('canned-responses')
  canned() {
    return this.tickets.listCanned();
  }

  @Roles(...STAFF)
  @Post('canned-responses')
  createCanned(@Body() dto: CannedDto, @CurrentUser() user: AuthUser) {
    return this.tickets.createCanned(dto, user);
  }

  @Roles(...STAFF)
  @Put('canned-responses/:id')
  updateCanned(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CannedDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tickets.updateCanned(id, dto, user);
  }

  @Roles(...STAFF)
  @Delete('canned-responses/:id')
  deleteCanned(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.tickets.deleteCanned(id, user);
  }

  @Get('ticket-templates')
  templates() {
    return this.tickets.listTemplates();
  }

  @Roles(...STAFF)
  @Post('ticket-templates')
  createTemplate(@Body() dto: TemplateDto, @CurrentUser() user: AuthUser) {
    return this.tickets.createTemplate(dto, user);
  }

  @Roles(...STAFF)
  @Put('ticket-templates/:id')
  updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TemplateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tickets.updateTemplate(id, dto, user);
  }

  @Roles(...STAFF)
  @Delete('ticket-templates/:id')
  deleteTemplate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.tickets.deleteTemplate(id, user);
  }

  @Roles(...STAFF)
  @Post('support-tickets/bulk-assign')
  bulkAssign(@Body() dto: BulkAssignDto, @CurrentUser() user: AuthUser) {
    return this.tickets.bulkAssign(dto.ids, dto.userId, user);
  }

  @Roles(...STAFF)
  @Post('support-tickets/bulk-close')
  bulkClose(@Body() dto: BulkCloseDto, @CurrentUser() user: AuthUser) {
    return this.tickets.bulkClose(dto.ids, dto.comment, user);
  }

  @Roles(...STAFF)
  @Patch('support-tickets/notify-pref')
  notifyPref(@Body() dto: NotifyPrefDto, @CurrentUser() user: AuthUser) {
    return this.tickets.setNotifyPref(user, dto.pref);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post('support-tickets/digest/run')
  runDigest() {
    return this.tickets.sendDailyDigests();
  }

  @Get('support-tickets/:id')
  get(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.tickets.get(id, user);
  }

  @Get('support-tickets/:id/timeline')
  timeline(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.tickets.timeline(id, user);
  }

  @Get('support-tickets/:id/requester-assets')
  requesterAssets(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.tickets.requesterAssets(id, user);
  }

  @Roles(...STAFF)
  @Post('support-tickets/:id/link-asset')
  linkAsset(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { assetId?: number | null },
    @CurrentUser() user: AuthUser,
  ) {
    return this.tickets.linkAsset(id, body.assetId ?? null, user);
  }

  @Roles(...STAFF)
  @Get('ticket-priority-targets')
  priorityTargets() {
    return this.tickets.listPriorityTargets();
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Put('ticket-priority-targets')
  savePriorityTargets(
    @Body() body: { targets: { priority: 'low' | 'medium' | 'high' | 'urgent'; targetMinutes: number | null }[] },
    @CurrentUser() user: AuthUser,
  ) {
    return this.tickets.upsertPriorityTargets(body.targets ?? [], user);
  }

  @Roles(...ALL_ROLES)
  @Post('support-tickets')
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: AuthUser) {
    return this.tickets.create(dto, user);
  }

  @Roles(...STAFF)
  @Post('support-tickets/:id/assign')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTicketDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tickets.assign(id, dto.userId ?? null, user);
  }

  @Roles(...STAFF)
  @Patch('support-tickets/:id/transition')
  transition(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransitionTicketDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tickets.transition(id, dto.status, user);
  }

  @Post('support-tickets/:id/comments')
  comment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CommentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tickets.comment(id, dto.body, dto.isInternal === true, user);
  }

  @Post('support-tickets/:id/watchers')
  addWatcher(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WatcherDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tickets.addWatcher(id, dto.employeeId, user);
  }

  @Roles(...STAFF)
  @Delete('support-tickets/:id/watchers/:employeeId')
  removeWatcher(
    @Param('id', ParseIntPipe) id: number,
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tickets.removeWatcher(id, employeeId, user);
  }

  @Roles(...STAFF)
  @Post('support-tickets/:id/time')
  logTime(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TimeLogDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tickets.logTime(id, dto.minutes, dto.note, user);
  }

  @Post('support-tickets/:id/rate')
  rate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RateTicketDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tickets.rate(id, dto.rating, dto.comment, user);
  }

  @Roles(...STAFF)
  @Post('support-tickets/:id/duplicate')
  duplicate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DuplicateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tickets.markDuplicate(id, dto.originalTicketNumber, user);
  }

  @Post('support-tickets/:id/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  uploadAttachment(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Uploaded,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('No file uploaded (field name must be "file")');
    return this.tickets.addAttachment(id, file, user);
  }

  @Get('support-tickets/:id/attachments/:attId')
  async downloadAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('attId', ParseIntPipe) attId: number,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const row = await this.tickets.getAttachment(id, attId, user);
    res.setHeader('Content-Type', row.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${row.filename}"`);
    res.send(Buffer.from(row.data));
  }
}
