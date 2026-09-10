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
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';

export class CreateCategoryDto {
  @IsString() @MinLength(2) @MaxLength(6) code!: string;
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() description?: string;
}
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

@ApiTags('categories')
@Controller('asset-categories')
export class CategoriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query() query: ListQuery) {
    const { skip, take, orderBy } = parseListQuery(query, ['id', 'code', 'name']);
    const [data, total] = await Promise.all([
      this.prisma.assetCategory.findMany({ skip, take, orderBy }),
      this.prisma.assetCategory.count(),
    ]);
    return { data, total };
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.assetCategory.findUniqueOrThrow({ where: { id } });
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post()
  async create(@Body() dto: CreateCategoryDto, @CurrentUser('id') userId: number) {
    const cat = await this.prisma.assetCategory.create({
      data: { ...dto, code: dto.code.toUpperCase() },
    });
    await this.audit.record({
      entityType: 'AssetCategory',
      entityId: cat.id,
      action: 'create',
      summary: `Created category ${cat.code} (${cat.name})`,
      changedById: userId,
      newValue: cat,
    });
    return cat;
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser('id') userId: number,
  ) {
    const before = await this.prisma.assetCategory.findUniqueOrThrow({ where: { id } });
    const cat = await this.prisma.assetCategory.update({
      where: { id },
      data: { ...dto, ...(dto.code ? { code: dto.code.toUpperCase() } : {}) },
    });
    await this.audit.record({
      entityType: 'AssetCategory',
      entityId: id,
      action: 'update',
      summary: `Updated category ${cat.code}`,
      changedById: userId,
      oldValue: before,
      newValue: cat,
    });
    return cat;
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    const assetCount = await this.prisma.asset.count({ where: { categoryId: id } });
    if (assetCount > 0) {
      throw new BadRequestException(
        `Cannot delete: ${assetCount} asset(s) still use this category. Recategorise them first.`,
      );
    }
    const cat = await this.prisma.assetCategory.delete({ where: { id } });
    await this.audit.record({
      entityType: 'AssetCategory',
      entityId: id,
      action: 'delete',
      summary: `Deleted category ${cat.code}`,
      changedById: userId,
      oldValue: cat,
    });
    return cat;
  }
}
