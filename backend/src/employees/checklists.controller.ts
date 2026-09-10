import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChecklistKind, RoleName } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

class TemplateDto {
  @IsString() name!: string;
  @IsEnum(ChecklistKind) kind!: ChecklistKind;
  @IsArray() @IsString({ each: true }) items!: string[];
}

class StartChecklistDto {
  @IsOptional() templateId?: number;
  @IsEnum(ChecklistKind) kind!: ChecklistKind;
}

class ToggleItemDto {
  @IsBoolean() done!: boolean;
}

@ApiTags('checklists')
@Controller()
export class ChecklistsController {
  constructor(private readonly prisma: PrismaService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Get('checklist-templates')
  templates() {
    return this.prisma.checklistTemplate.findMany({
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post('checklist-templates')
  createTemplate(@Body() dto: TemplateDto) {
    return this.prisma.checklistTemplate.create({
      data: {
        name: dto.name,
        kind: dto.kind,
        items: {
          create: dto.items.filter(Boolean).map((label, i) => ({ label, sortOrder: i })),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post('employees/:id/checklists')
  async start(
    @Param('id', ParseIntPipe) employeeId: number,
    @Body() dto: StartChecklistDto,
    @CurrentUser() actor: AuthUser,
  ) {
    let labels: string[] = [];
    if (dto.templateId) {
      const tpl = await this.prisma.checklistTemplate.findUnique({
        where: { id: dto.templateId },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
      labels = tpl?.items.map((i) => i.label) ?? [];
    }
    if (labels.length === 0) {
      labels =
        dto.kind === 'onboard'
          ? ['Issue laptop', 'Create login', 'VPN / MFA', 'ID badge']
          : ['Recover assets', 'Disable login', 'Revoke access'];
    }
    return this.prisma.employeeChecklist.create({
      data: {
        employeeId,
        templateId: dto.templateId ?? null,
        kind: dto.kind,
        items: {
          create: labels.map((label, i) => ({ label, sortOrder: i, doneById: actor.id })),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Patch('employee-checklist-items/:id')
  toggle(@Param('id', ParseIntPipe) id: number, @Body() dto: ToggleItemDto, @CurrentUser() actor: AuthUser) {
    return this.prisma.employeeChecklistItem.update({
      where: { id },
      data: {
        done: dto.done,
        doneAt: dto.done ? new Date() : null,
        doneById: actor.id,
      },
    });
  }
}
