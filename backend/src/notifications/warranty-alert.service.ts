import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { runUnscoped, runWithTenant } from '../tenancy/context';
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

  /** Daily 08:00 — fires alerts the day an asset hits a 90/60/30-day warranty threshold. */
  async runThresholdAlertsAllTenants(): Promise<{
    tenantsProcessed: number;
    checked: number;
    alertsCreated: number;
    errors: string[];
  }> {
    const tenants = await runUnscoped(() =>
      this.prisma.tenant.findMany({ where: { status: { not: 'cancelled' } }, select: { id: true } }),
    );
    let checked = 0;
    let alertsCreated = 0;
    const errors: string[] = [];
    for (const t of tenants) {
      try {
        const result = await runWithTenant(t.id, () => this.runCheck());
        checked += result.checked;
        alertsCreated += result.created;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
    return { tenantsProcessed: tenants.length, checked, alertsCreated, errors };
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
      await this.notifications.fanOutToIt({
        type: 'warranty_expiry',
        title: `Warranty expiring in ${threshold} days ${marker}: ${asset.assetCode}`,
        message:
          `${asset.assetCode} (${asset.brand ?? ''} ${asset.model ?? ''}`.trim() +
          `) at ${asset.location?.code ?? '—'} has ${remaining} day(s) of warranty remaining ` +
          `(ends ${asset.warrantyEnd.toISOString().slice(0, 10)}).`,
        assetId: asset.id,
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

  /** Monday 08:00 — summary of warranties ending in the next 90 days. */
  async runWeeklyDigestAllTenants(): Promise<{
    tenantsProcessed: number;
    rows: number;
    emailedTo: number;
    errors: string[];
  }> {
    const tenants = await runUnscoped(() =>
      this.prisma.tenant.findMany({ where: { status: { not: 'cancelled' } }, select: { id: true } }),
    );
    let rows = 0;
    let emailedTo = 0;
    const errors: string[] = [];
    for (const t of tenants) {
      try {
        const result = await runWithTenant(t.id, () => this.sendWeeklyDigest());
        rows += result.rows;
        emailedTo += result.emailedTo;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
    return { tenantsProcessed: tenants.length, rows, emailedTo, errors };
  }

  async sendWeeklyDigest(now: Date = new Date()): Promise<{ emailedTo: number; rows: number }> {
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 90);
    const assets = await this.prisma.asset.findMany({
      where: {
        warrantyEnd: { not: null, gte: now, lte: horizon },
        status: { notIn: ['retired', 'disposed'] },
      },
      orderBy: { warrantyEnd: 'asc' },
      take: 200,
      select: { assetCode: true, brand: true, model: true, warrantyEnd: true },
    });
    if (assets.length === 0) return { emailedTo: 0, rows: 0 };
    const recipients = await this.notifications.itRecipients();
    if (recipients.length === 0) return { emailedTo: 0, rows: assets.length };
    const lines = assets.map(
      (a) =>
        `• ${a.assetCode} — ${`${a.brand ?? ''} ${a.model ?? ''}`.trim()} ends ${a.warrantyEnd?.toISOString().slice(0, 10)}`,
    );
    await this.mailer.send({
      to: recipients,
      subject: `NewVision weekly warranty report (${assets.length} due in 90 days)`,
      text: `Warranties ending in the next 90 days:\n\n${lines.join('\n')}`,
    });
    return { emailedTo: recipients.length, rows: assets.length };
  }
}
