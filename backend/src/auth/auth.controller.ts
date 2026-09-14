import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
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
import { ROLE_PERMISSIONS } from '../common/rbac/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { TenantService } from '../tenancy/tenant.service';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  DisableMfaDto,
  ForgotPasswordDto,
  MfaEnableDto,
  MfaVerifyDto,
  RefreshDto,
  ResetPasswordDto,
  SignupDto,
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
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = mfaTokenOf(dto);
    if (!token) throw new BadRequestException('mfa_token is required');
    const result = await this.authService.verifyMfa(token, dto.code);
    setRefreshCookie(res, result.refresh_token, dto.remember !== false);
    if (includeRefreshInBody()) return result;
    return { access_token: result.access_token, user: result.user };
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

  @Public()
  @Post('signup')
  @HttpCode(201)
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.signup(dto);
    setRefreshCookie(res, result.refresh_token, true);
    if (includeRefreshInBody()) return result;
    return { access_token: result.access_token, user: result.user, tenant: result.tenant };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const row = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { emailNotifyPref: true, totpEnabled: true },
    });
    const tenant = await this.tenants.snapshot(user);
    return {
      ...user,
      permissions: ROLE_PERMISSIONS[user.role],
      emailNotifyPref: row?.emailNotifyPref ?? 'immediate',
      totpEnabled: Boolean(row?.totpEnabled),
      tenant,
    };
  }
}
