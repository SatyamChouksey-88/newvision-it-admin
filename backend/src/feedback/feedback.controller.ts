import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';

class SubmitFeedbackDto {
  @IsString()
  @MinLength(5)
  message!: string;

  @IsOptional()
  @IsString()
  page?: string;
}

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async submit(@Body() dto: SubmitFeedbackDto, @CurrentUser() user: AuthUser) {
    await this.audit.record({
      entityType: 'Feedback',
      entityId: user.id,
      action: 'create',
      summary: `In-app feedback from ${user.email}`,
      changedById: user.id,
      newValue: { message: dto.message.slice(0, 500), page: dto.page ?? null },
    });
    return { success: true };
  }

  @Get()
  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  async list(@Query() query: ListQuery) {
    const { skip, take } = parseListQuery(query, ['id', 'createdAt']);
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { entityType: 'Feedback' },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { changedBy: { select: { id: true, email: true, fullName: true } } },
      }),
      this.prisma.auditLog.count({ where: { entityType: 'Feedback' } }),
    ]);
    return { data, total };
  }
}
