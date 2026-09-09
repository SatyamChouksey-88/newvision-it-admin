import {
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
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';

export class CreateLocationDto {
  @IsString() @MinLength(2) @MaxLength(6) code!: string;
  @IsString() @MinLength(2) name!: string;
  @IsString() city!: string;
  @IsOptional() @IsString() address?: string;
}
export class UpdateLocationDto extends PartialType(CreateLocationDto) {}

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query() query: ListQuery) {
    const { skip, take, orderBy } = parseListQuery(query, ['id', 'code', 'name', 'city']);
    const [data, total] = await Promise.all([
      this.prisma.location.findMany({ skip, take, orderBy }),
      this.prisma.location.count(),
    ]);
    return { data, total };
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.location.findUniqueOrThrow({ where: { id } });
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post()
  async create(@Body() dto: CreateLocationDto, @CurrentUser('id') userId: number) {
    const loc = await this.prisma.location.create({
      data: { ...dto, code: dto.code.toUpperCase() },
    });
    await this.audit.record({
      entityType: 'Location',
      entityId: loc.id,
      action: 'create',
      summary: `Created location ${loc.code} (${loc.name})`,
      changedById: userId,
      newValue: loc,
    });
    return loc;
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLocationDto,
    @CurrentUser('id') userId: number,
  ) {
    const before = await this.prisma.location.findUniqueOrThrow({ where: { id } });
    const loc = await this.prisma.location.update({
      where: { id },
      data: { ...dto, ...(dto.code ? { code: dto.code.toUpperCase() } : {}) },
    });
    await this.audit.record({
      entityType: 'Location',
      entityId: id,
      action: 'update',
      summary: `Updated location ${loc.code}`,
      changedById: userId,
      oldValue: before,
      newValue: loc,
    });
    return loc;
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    const loc = await this.prisma.location.delete({ where: { id } });
    await this.audit.record({
      entityType: 'Location',
      entityId: id,
      action: 'delete',
      summary: `Deleted location ${loc.code}`,
      changedById: userId,
      oldValue: loc,
    });
    return loc;
  }
}
