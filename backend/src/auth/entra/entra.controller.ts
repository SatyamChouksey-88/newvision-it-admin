import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from '../auth.service';
import { publicAppUrl } from '../../common/scan-url';
import { includeRefreshInBody, setRefreshCookie } from '../refresh-cookie';
import { entraConfigured } from './entra-config';
import { EntraService } from './entra.service';
import { EntraStateStore } from './entra-state-store';

/**
 * Phase 2 — "Sign in with Microsoft", alongside (not replacing) the existing password+TOTP
 * flow. Redirect-based authorization-code + PKCE flow: the real access token is never put in a
 * URL or browser history — only a single-use opaque handoff code is, which the frontend
 * exchanges immediately over POST (see exchange() below).
 */
@ApiTags('auth')
@Controller('auth/entra')
export class EntraController {
  private readonly logger = new Logger(EntraController.name);

  constructor(
    private readonly entra: EntraService,
    private readonly authService: AuthService,
    private readonly stateStore: EntraStateStore,
  ) {}

  @Public()
  @Get('login')
  async login(@Query('login_hint') loginHint: string | undefined, @Res() res: Response) {
    const { url, state, nonce, codeVerifier } = await this.entra.buildAuthorizationRequest(loginHint);
    this.stateStore.savePendingLogin(state, { nonce, codeVerifier });
    return res.redirect(url);
  }

  @Public()
  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response) {
    const frontendBase = publicAppUrl();
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    if (req.query.error) {
      return res.redirect(
        `${frontendBase}/login?entraError=${encodeURIComponent(String(req.query.error))}`,
      );
    }
    if (!state) {
      return res.redirect(`${frontendBase}/login?entraError=missing_state`);
    }
    const pending = this.stateStore.takePendingLogin(state);
    if (!pending) {
      return res.redirect(`${frontendBase}/login?entraError=expired_or_replayed`);
    }
    try {
      const identity = await this.entra.handleCallback(req.query as Record<string, unknown>, {
        state,
        nonce: pending.nonce,
        codeVerifier: pending.codeVerifier,
      });
      const user = await this.entra.resolveUserForSignIn(identity);
      const result = await this.authService.loginWithVerifiedIdentity(user, 'entra');
      if ('mfaRequired' in result || 'mfaSetupRequired' in result || 'mfaEnrollRequired' in result) {
        const handoff = this.stateStore.createHandoff(result);
        return res.redirect(`${frontendBase}/auth/entra/complete?handoff=${handoff}`);
      }
      setRefreshCookie(res, result.refresh_token, true);
      const payload = includeRefreshInBody()
        ? result
        : { access_token: result.access_token, user: result.user };
      const handoff = this.stateStore.createHandoff(payload);
      return res.redirect(`${frontendBase}/auth/entra/complete?handoff=${handoff}`);
    } catch (err) {
      this.logger.warn(`Entra callback failed: ${err instanceof Error ? err.message : String(err)}`);
      return res.redirect(`${frontendBase}/login?entraError=verification_failed`);
    }
  }

  /** The frontend's one call to trade a single-use handoff code for the real login result. */
  @Public()
  @Post('exchange')
  @HttpCode(200)
  exchange(@Body('handoff') handoff: string) {
    if (!handoff) throw new BadRequestException('handoff is required');
    const entry = this.stateStore.takeHandoff(handoff);
    if (!entry) throw new BadRequestException('Invalid or expired handoff code');
    return entry.payload;
  }

  /** Lets the frontend show/hide the "Sign in with Microsoft" button without guessing. */
  @Public()
  @Get('status')
  status() {
    return { available: true, configured: entraConfigured() };
  }
}
