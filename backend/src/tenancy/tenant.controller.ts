import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import type { Response } from 'express';
import { secretsMatch } from '../common/crypto-secret';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { runUnscoped } from './context';
import { STARTER_MODULES, TEAM_MODULES } from './plans';
import { csvTemplates, TenantService } from './tenant.service';

@ApiTags('tenant')
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenants: TenantService) {}

  @Get()
  snapshot(@CurrentUser() user: AuthUser) {
    return this.tenants.snapshot(user);
  }

  @Patch('branding')
  @Roles(RoleName.SUPER_ADMIN)
  branding(
    @CurrentUser() user: AuthUser,
    @Body()
    dto: { name?: string; logoUrl?: string | null; mailFromName?: string; mailFromAddress?: string },
  ) {
    return this.tenants.updateBranding(user, dto);
  }

  @Post('onboarding/skip')
  skip(@CurrentUser() user: AuthUser) {
    return this.tenants.patchOnboarding(user, { skipped: true });
  }

  @Post('onboarding/sample')
  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  loadSample(@CurrentUser() user: AuthUser) {
    return this.tenants.loadSample(user);
  }

  @Get('templates/employees.csv')
  @Header('Content-Type', 'text/csv')
  employeesTemplate(@Res() res: Response) {
    res.setHeader('Content-Disposition', 'attachment; filename="employees-template.csv"');
    res.send(csvTemplates().employees);
  }

  @Get('templates/assets.csv')
  @Header('Content-Type', 'text/csv')
  assetsTemplate(@Res() res: Response) {
    res.setHeader('Content-Disposition', 'attachment; filename="assets-template.csv"');
    res.send(csvTemplates().assets);
  }

  @Get('export')
  @Roles(RoleName.SUPER_ADMIN)
  export(@CurrentUser() user: AuthUser) {
    return this.tenants.exportAll(user);
  }

  @Get('billing')
  @Roles(RoleName.SUPER_ADMIN)
  billing(@CurrentUser() user: AuthUser) {
    return this.tenants.billing(user);
  }

  @Delete()
  @Roles(RoleName.SUPER_ADMIN)
  close(@CurrentUser() user: AuthUser, @Body() dto: { confirmName?: string; password?: string }) {
    return this.tenants.closeAccount(user, dto.confirmName ?? '', dto.password ?? '');
  }
}

@ApiTags('platform')
@Controller('platform/tenants')
export class PlatformTenantsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Ops hook after Zoho Books records a Team subscription. Not a public billing API. */
  @Public()
  @Patch(':id')
  async update(
    @Param('id') idRaw: string,
    @Body()
    body: {
      secret?: string;
      plan?: 'starter' | 'team';
      status?: 'trial' | 'active' | 'expired' | 'cancelled';
    },
  ) {
    const expected = process.env.PLATFORM_ADMIN_SECRET;
    if (!expected || !secretsMatch(body.secret, expected)) {
      return { ok: false };
    }
    const id = Number(idRaw);
    const modules = body.plan === 'starter' ? STARTER_MODULES : TEAM_MODULES;
    const tenant = await runUnscoped(() =>
      this.prisma.tenant.update({
        where: { id },
        data: {
          plan: body.plan,
          status: body.status,
          modules,
        },
      }),
    );
    return { ok: true, tenant: { id: tenant.id, plan: tenant.plan, status: tenant.status } };
  }
}
