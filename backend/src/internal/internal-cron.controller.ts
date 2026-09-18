import {
  Controller,
  ForbiddenException,
  Headers,
  Logger,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { secretsMatch } from '../common/crypto-secret';
import { EmailInboxService } from '../tickets/email-inbox.service';

@ApiTags('internal')
@Controller('internal/cron')
export class InternalCronController {
  private readonly logger = new Logger(InternalCronController.name);

  constructor(private readonly inbox: EmailInboxService) {}

  @Public()
  @Post('poll-email-tickets')
  async pollEmailTickets(@Headers('x-cron-secret') secret?: string) {
    const configured = process.env.CRON_SECRET?.trim();
    if (!configured) {
      throw new ServiceUnavailableException('CRON_SECRET is not configured');
    }
    if (!secretsMatch(secret, configured)) {
      throw new ForbiddenException('Invalid or missing X-Cron-Secret');
    }

    const startedAt = new Date();
    this.logger.log(`email-ticket poll started at ${startedAt.toISOString()}`);

    try {
      const result = await this.inbox.runEmailPollCycle();
      const finishedAt = new Date();
      this.logger.log(
        JSON.stringify({
          event: 'email-ticket-poll',
          startedAt: startedAt.toISOString(),
          finishedAt: finishedAt.toISOString(),
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          emailsProcessed: result.emailsProcessed,
          ticketsCreated: result.ticketsCreated,
          commentsAdded: result.commentsAdded,
          skipped: result.skipped,
          errors: result.errors,
        }),
      );
      return { ok: true, ...result, startedAt, finishedAt };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`email-ticket poll failed: ${message}`);
      throw e;
    }
  }
}
