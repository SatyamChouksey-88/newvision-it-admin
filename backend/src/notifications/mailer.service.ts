import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface MailMessage {
  to: string | string[];
  subject: string;
  text: string;
  /** Optional HTML body. Falls back to `text` when a transport isn't configured (console log). */
  html?: string;
  replyTo?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  headers?: Record<string, string>;
}

/**
 * Sends email via SMTP when configured (SMTP_HOST/PORT/USER/PASS), otherwise logs the
 * message to the console. Console fallback is the documented default for local dev
 * (see backend/.env.example) so warranty alerts are observable without a mail server.
 *
 * `send()` never throws: it's called from inside ticket/procurement/auth mutations that
 * must still succeed (and their data must still commit) even when the mail transport is
 * unreachable — e.g. Render Free often blocks outbound 587/465. A failed send is logged
 * loudly and tracked so `hasRecentFailure()` can surface it in the UI instead of it being
 * a silent console line an admin has to go looking for.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;
  private lastFailureAt: Date | null = null;
  private lastFailureMessage: string | null = null;

  constructor() {
    this.from = process.env.MAIL_FROM || 'NewVision IT <it-noreply@newvision.local>';
    const host = process.env.SMTP_HOST;
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
      });
    } else {
      this.transporter = null;
    }
  }

  get isLive(): boolean {
    return this.transporter !== null;
  }

  /** True when a live SMTP send has failed within the last hour — surfaced on the dashboard. */
  hasRecentFailure(): boolean {
    if (!this.lastFailureAt) return false;
    return Date.now() - this.lastFailureAt.getTime() < 60 * 60 * 1000;
  }

  get lastFailureDetail(): { at: Date; message: string } | null {
    if (!this.lastFailureAt || !this.lastFailureMessage) return null;
    return { at: this.lastFailureAt, message: this.lastFailureMessage };
  }

  async send(message: MailMessage): Promise<void> {
    const to = Array.isArray(message.to) ? message.to.join(', ') : message.to;
    if (!this.transporter) {
      this.logger.log(`[email:console] To: ${to} | ${message.subject}\n${message.text}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        replyTo: message.replyTo,
        messageId: message.messageId,
        inReplyTo: message.inReplyTo,
        references: message.references,
        headers: message.headers,
      });
      this.logger.log(`[email:sent] To: ${to} | ${message.subject}`);
    } catch (err) {
      // Best-effort: a broken/unreachable SMTP host must never fail the ticket, requisition,
      // contract, or password-reset mutation that triggered this notification.
      const detail = err instanceof Error ? err.message : String(err);
      this.lastFailureAt = new Date();
      this.lastFailureMessage = detail;
      this.logger.error(`[email:failed] To: ${to} | ${message.subject} | ${detail}`);
    }
  }
}
