import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { EmailInboxService } from './email-inbox.service';

@ApiTags('email-in')
@Controller('email-in')
export class EmailInboxController {
  constructor(private readonly inbox: EmailInboxService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Get('status')
  status() {
    return this.inbox.status();
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Post('test')
  test() {
    return this.inbox.testConnection();
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Post('poll')
  poll() {
    return this.inbox.pollImap();
  }

  /**
   * Webhook / staff ingest of a raw RFC-822 message. Super Admin JWT, or
   * `X-Email-Ingest-Secret` matching EMAIL_INGEST_SECRET.
   */
  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post('ingest')
  ingestStaff(@Body() body: { raw?: string }) {
    if (!body?.raw?.trim()) throw new BadRequestException('raw email body is required');
    return this.inbox.processRaw(body.raw);
  }

  /** Unauthenticated webhook — only when EMAIL_INGEST_SECRET is set and matches. */
  @Public()
  @Post('webhook')
  ingestWebhook(
    @Body() body: { raw?: string },
    @Headers('x-email-ingest-secret') secret?: string,
  ) {
    const configured = process.env.EMAIL_INGEST_SECRET;
    if (!configured || secret !== configured) {
      throw new ForbiddenException('Invalid or missing X-Email-Ingest-Secret');
    }
    if (!body?.raw?.trim()) throw new BadRequestException('raw email body is required');
    return this.inbox.processRaw(body.raw);
  }
}
