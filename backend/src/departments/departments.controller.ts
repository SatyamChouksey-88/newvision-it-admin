import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags, PartialType } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';

export class CreateDepartmentDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() description?: string;
}
export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}

@ApiTags('departments')
@Controller('departments')
export class DepartmentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query() query: ListQuery) {
    const { skip, take, orderBy } = parseListQuery(query, ['id', 'name']);
    const [rows, total] = await Promise.all([
      this.prisma.department.findMany({
        skip,
        take,
        orderBy,
        include: { _count: { select: { employees: true } } },
      }),
      this.prisma.department.count(),
    ]);
    const data = rows.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      employeeCount: d._count.employees,
    }));
    return { data, total };
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.department.findUniqueOrThrow({ where: { id } });
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post()
  async create(@Body() dto: CreateDepartmentDto, @CurrentUser('id') userId: number) {
    const dep = await this.prisma.department.create({ data: dto });
    await this.audit.record({
      entityType: 'Department',
      entityId: dep.id,
      action: 'create',
      summary: `Created department ${dep.name}`,
      changedById: userId,
      newValue: dep,
    });
    return dep;
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser('id') userId: number,
  ) {
    const before = await this.prisma.department.findUniqueOrThrow({ where: { id } });
    const dep = await this.prisma.department.update({ where: { id }, data: dto });
    await this.audit.record({
      entityType: 'Department',
      entityId: id,
      action: 'update',
      summary: `Updated department ${dep.name}`,
      changedById: userId,
      oldValue: before,
      newValue: dep,
    });
    return dep;
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    const [employeeCount, assetCount] = await Promise.all([
      this.prisma.employee.count({ where: { departmentId: id } }),
      this.prisma.asset.count({ where: { departmentId: id } }),
    ]);
    if (employeeCount > 0 || assetCount > 0) {
      throw new BadRequestException(
        `Cannot delete: ${employeeCount} employee(s) and ${assetCount} asset(s) still reference this department. Reassign them first.`,
      );
    }
    const dep = await this.prisma.department.delete({ where: { id } });
    await this.audit.record({
      entityType: 'Department',
      entityId: id,
      action: 'delete',
      summary: `Deleted department ${dep.name}`,
      changedById: userId,
      oldValue: dep,
    });
    return dep;
  }
}
