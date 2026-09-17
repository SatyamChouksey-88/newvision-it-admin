import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import type { Request, Response } from 'express';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { effectivePermissions } from '../common/rbac/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { TenantService } from '../tenancy/tenant.service';
import { AuthService } from './auth.service';
import { LoginRateLimitService } from './login-rate-limit';
import {
  ChangePasswordDto,
  DisableMfaDto,
  ForgotPasswordDto,
  MfaEnableDto,
  MfaVerifyDto,
  RefreshDto,
  ResetPasswordDto,
} from './dto/auth-extra.dto';
import { LoginDto } from './dto/login.dto';
import {
  clearRefreshCookie,
  clientIp,
  includeRefreshInBody,
  readRefreshCookie,
  setRefreshCookie,
} from './refresh-cookie';

function mfaTokenOf(dto: MfaVerifyDto): string {
  return (dto.mfa_token || dto.mfaToken || '').trim();
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly tenants: TenantService,
    private readonly rateLimit: LoginRateLimitService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto.email, dto.password, clientIp(req));
    if ('mfaRequired' in result || 'mfaSetupRequired' in result || 'mfaEnrollRequired' in result) {
      return result;
    }
    setRefreshCookie(res, result.refresh_token, dto.remember !== false);
    if (includeRefreshInBody()) return result;
    return { access_token: result.access_token, user: result.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = readRefreshCookie(req) || dto.refresh_token;
    if (!token) throw new UnauthorizedException('Invalid or expired refresh token');
    const result = await this.authService.refresh(token);
    setRefreshCookie(res, result.refresh_token, true);
    if (includeRefreshInBody()) return result;
    return { access_token: result.access_token, user: result.user };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logout(user.id, user.email);
    clearRefreshCookie(res);
    return result;
  }

  @Post('change-password')
  @HttpCode(200)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    clearRefreshCookie(res);
    return result;
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.authService.forgotPassword(dto.email, clientIp(req));
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.resetPassword(dto.uid, dto.token, dto.newPassword);
    clearRefreshCookie(res);
    return result;
  }

  @Public()
  @Post('mfa/verify')
  @HttpCode(200)
  async verifyMfa(
    @Body() dto: MfaVerifyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = mfaTokenOf(dto);
    if (!token) throw new BadRequestException('mfa_token is required');
    // Phase 1 hardening: a 6-digit TOTP code is brute-forceable in ~1e6 attempts if unthrottled.
    // Keyed on IP + the short-lived mfa_token itself (each login attempt gets its own), reusing
    // the same throttle used for /auth/login.
    const ip = clientIp(req);
    this.rateLimit.assertAllowed(ip, token);
    try {
      const result = await this.authService.verifyMfa(token, dto.code);
      this.rateLimit.recordSuccess(ip, token);
      setRefreshCookie(res, result.refresh_token, dto.remember !== false);
      if (includeRefreshInBody()) return result;
      return { access_token: result.access_token, user: result.user };
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        this.rateLimit.recordFailure(ip, token);
      }
      throw err;
    }
  }

  @Get('mfa')
  mfaStatus(@CurrentUser() user: AuthUser) {
    return this.mfaPayload(user);
  }

  @Get('mfa/status')
  mfaStatusAlias(@CurrentUser() user: AuthUser) {
    return this.mfaPayload(user);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Post('mfa/setup')
  @HttpCode(200)
  beginMfaSetup(@CurrentUser() user: AuthUser) {
    return this.authService.beginMfaSetup(user);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Post('mfa/begin')
  @HttpCode(200)
  beginMfaSetupAlias(@CurrentUser() user: AuthUser) {
    return this.authService.beginMfaSetup(user);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Post('mfa/enable')
  @HttpCode(200)
  enableMfa(@CurrentUser() user: AuthUser, @Body() dto: MfaEnableDto) {
    return this.authService.enableMfa(user.id, dto.code);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Post('mfa/disable')
  @HttpCode(200)
  disableMfa(@CurrentUser() user: AuthUser, @Body() dto: DisableMfaDto) {
    return this.authService.disableMfa(user.id, dto.currentPassword, dto.code);
  }

  private async mfaPayload(user: AuthUser) {
    const status = await this.authService.mfaStatus(user.id);
    return { ...status, totpEnabled: status.enabled };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const row = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        emailNotifyPref: true,
        totpEnabled: true,
        customRole: { select: { id: true, label: true, key: true } },
      },
    });
    const tenant = await this.tenants.snapshot(user);
    const customRole =
      row?.customRole && user.customRoleId === row.customRole.id ? row.customRole : null;
    return {
      ...user,
      permissions: effectivePermissions(user.role, user.customRoleId),
      customRole,
      emailNotifyPref: row?.emailNotifyPref ?? 'immediate',
      totpEnabled: Boolean(row?.totpEnabled),
      tenant,
    };
  }
}
