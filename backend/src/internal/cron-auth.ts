import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { secretsMatch } from '../common/crypto-secret';

export function assertCronSecret(header?: string): void {
  const configured = process.env.CRON_SECRET?.trim();
  if (!configured) {
    throw new ServiceUnavailableException('CRON_SECRET is not configured');
  }
  if (!secretsMatch(header, configured)) {
    throw new ForbiddenException('Invalid or missing X-Cron-Secret');
  }
}
