import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { daysRemaining, matchingThreshold, WARRANTY_THRESHOLDS } from '../common/warranty';
import { MailerService } from './mailer.service';
import { NotificationsService } from './notifications.service';

export interface WarrantyCheckResult {
  checked: number;
  created: number;
  byThreshold: Record<number, number>;
  emailedTo: number;
}

@Injectable()
export class WarrantyAlertService {
  private readonly logger = new Logger(WarrantyAlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Runs daily; fires alerts the day an asset hits a 90/60/30-day warranty threshold. */
  @Cron(CronExpression.EVERY_DAY_AT_8AM, { name: 'warranty-threshold-alerts' })
  async scheduledCheck(): Promise<void> {
    const result = await this.runCheck();
    this.logger.log(
      `Warranty check: ${result.checked} scanned, ${result.created} alerts created ` +
        `(90d=${result.byThreshold[90] ?? 0}, 60d=${result.byThreshold[60] ?? 0}, 30d=${
          result.byThreshold[30] ?? 0
        }).`,
    );
  }

  /**
   * Scan assets and create a warranty_expiry notification for each asset whose remaining
   * warranty is exactly a configured threshold today. De-duplicated per asset+threshold, so
   * re-running is safe. Returns a summary (also used by the manual-trigger endpoint and tests).
   */
  async runCheck(now: Date = new Date()): Promise<WarrantyCheckResult> {
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + Math.max(...WARRANTY_THRESHOLDS) + 1);

    const assets = await this.prisma.asset.findMany({
      where: {
        warrantyEnd: { not: null, gte: now, lte: horizon },
        status: { notIn: ['retired', 'disposed'] },
      },
      include: { location: true },
    });

    const byThreshold: Record<number, number> = {};
    const emailLines: string[] = [];
    let created = 0;

    for (const asset of assets) {
      if (!asset.warrantyEnd) continue;
      const threshold = matchingThreshold(asset.warrantyEnd, now);
      if (threshold === null) continue;

      const marker = `[${threshold}-day]`;
      const already = await this.prisma.notification.count({
        where: { assetId: asset.id, type: 'warranty_expiry', title: { contains: marker } },
      });
      if (already > 0) continue;

      const remaining = daysRemaining(asset.warrantyEnd, now);
      await this.prisma.notification.create({
        data: {
          type: 'warranty_expiry',
          title: `Warranty expiring in ${threshold} days ${marker}: ${asset.assetCode}`,
          message:
            `${asset.assetCode} (${asset.brand ?? ''} ${asset.model ?? ''}`.trim() +
            `) at ${asset.location?.code ?? '—'} has ${remaining} day(s) of warranty remaining ` +
            `(ends ${asset.warrantyEnd.toISOString().slice(0, 10)}).`,
          assetId: asset.id,
        },
      });
      created++;
      byThreshold[threshold] = (byThreshold[threshold] ?? 0) + 1;
      emailLines.push(
        `• ${asset.assetCode} — ${threshold} days left (ends ${asset.warrantyEnd
          .toISOString()
          .slice(0, 10)})`,
      );
    }

    let emailedTo = 0;
    if (created > 0) {
      const recipients = await this.notifications.itRecipients();
      if (recipients.length > 0) {
        await this.mailer.send({
          to: recipients,
          subject: `NewVision: ${created} asset warranty alert(s)`,
          text:
            `The following assets have reached a warranty alert threshold:\n\n` +
            emailLines.join('\n'),
        });
        emailedTo = recipients.length;
      }
    }

    return { checked: assets.length, created, byThreshold, emailedTo };
  }
}
