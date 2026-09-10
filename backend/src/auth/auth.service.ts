import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { MailerService } from '../notifications/mailer.service';
import { PrismaService } from '../prisma/prisma.service';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function randomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mailer: MailerService,
  ) {}

  async validateUser(email: string, password: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { role: true },
    });
    if (!user?.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
      employeeId: user.employeeId,
    };
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    return this.issueTokenPair(user);
  }

  /** Issues a fresh access + refresh token pair and rotates the stored refresh-token hash. */
  private async issueTokenPair(user: AuthUser) {
    const access_token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    const refresh_token = await this.jwt.signAsync(
      { sub: user.id, jti: randomToken() },
      { secret: this.refreshSecret(), expiresIn: '7d' },
    );
    const refreshTokenHash = await bcrypt.hash(refresh_token, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
    return { access_token, refresh_token, user };
  }

  private refreshSecret(): string {
    return `${process.env.JWT_SECRET ?? 'dev-only-secret-change-me'}::refresh`;
  }

  /** Verifies a refresh token (signature + stored hash + expiry) and rotates it. */
  async refresh(refreshToken: string) {
    let payload: { sub: number };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: this.refreshSecret() });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const row = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });
    if (!row?.isActive || !row.refreshTokenHash || !row.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Refresh token no longer valid');
    }
    if (row.refreshTokenExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }
    const matches = await bcrypt.compare(refreshToken, row.refreshTokenHash);
    if (!matches) {
      throw new UnauthorizedException('Refresh token no longer valid');
    }
    const user: AuthUser = {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      role: row.role.name,
      employeeId: row.employeeId,
    };
    return this.issueTokenPair(user);
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null, refreshTokenExpiresAt: null },
    });
    return { success: true };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Current password is incorrect');
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await AuthService.hashPassword(newPassword) },
    });
    return { success: true };
  }

  /** Always returns success (no user enumeration); only sends an email when the address matches. */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user?.isActive) {
      await this.sendSetPasswordLink(user.id, user.email, {
        subject: 'Reset your NewVision password',
        intro: 'Reset your NewVision password using the link below. It expires in 1 hour.',
      });
    }
    return { success: true };
  }

  /**
   * Generates a reset token and emails a set/reset-password link. Shared by self-service
   * "forgot password" and the Super Admin "create a login for this employee" flow (B2/B1) so a
   * new account never needs a temporary password typed/shared out of band.
   */
  async sendSetPasswordLink(
    userId: number,
    email: string,
    copy: { subject: string; intro: string },
  ): Promise<void> {
    const token = randomToken();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        resetPasswordTokenHash: await bcrypt.hash(token, 10),
        resetPasswordExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });
    const appUrl = (process.env.PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/$/, '');
    const link = `${appUrl}/reset-password?uid=${userId}&token=${token}`;
    await this.mailer.send({
      to: email,
      subject: copy.subject,
      text: `${copy.intro}\n\n${link}\n\nThis link expires in 1 hour.`,
      html: `<p>${copy.intro}</p><p><a href="${link}">${link}</a></p>`,
    });
  }

  async resetPassword(userId: number, token: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.resetPasswordTokenHash || !user.resetPasswordExpiresAt) {
      throw new BadRequestException('Invalid or expired reset link');
    }
    if (user.resetPasswordExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Reset link has expired');
    }
    const matches = await bcrypt.compare(token, user.resetPasswordTokenHash);
    if (!matches) throw new BadRequestException('Invalid or expired reset link');
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await AuthService.hashPassword(newPassword),
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });
    return { success: true };
  }

  static async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }
}
