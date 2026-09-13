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

export type MailTransportKind = 'resend' | 'smtp' | 'console';

/** Prefer Resend (HTTPS) over SMTP so Render Free / blocked 587/465 still send mail. */
export function mailTransportKind(env: NodeJS.ProcessEnv = process.env): MailTransportKind {
  if (env.RESEND_API_KEY?.trim()) return 'resend';
  if (env.SMTP_HOST?.trim()) return 'smtp';
  return 'console';
}

export function parseFromAddress(from: string): { email: string; name?: string } {
  const m = from.match(/^\s*(.+?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].replaceAll(/^["']|["']$/g, ''), email: m[2].trim() };
  return { email: from.trim() };
}

export function resendPayload(from: string, message: MailMessage) {
  const to = Array.isArray(message.to) ? message.to : [message.to];
  const payload: Record<string, unknown> = {
    from,
    to,
    subject: message.subject,
    text: message.text,
  };
  if (message.html) payload.html = message.html;
  if (message.replyTo) payload.reply_to = message.replyTo;
  if (message.headers) payload.headers = message.headers;
  return payload;
}

/**
 * Sends email via Resend (HTTPS API) when `RESEND_API_KEY` is set, else SMTP when
 * `SMTP_HOST` is set, else logs to the console. `send()` never throws — ticket and
 * procurement mutations must still commit when mail is unreachable.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;
  private readonly resendKey: string | null;
  private lastFailureAt: Date | null = null;
  private lastFailureMessage: string | null = null;

  constructor() {
    this.from = process.env.MAIL_FROM || 'NewVision IT <it-noreply@newvision.local>';
    this.resendKey = process.env.RESEND_API_KEY?.trim() || null;
    const host = process.env.SMTP_HOST;
    if (!this.resendKey && host) {
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

  get transportKind(): MailTransportKind {
    if (this.resendKey) return 'resend';
    if (this.transporter) return 'smtp';
    return 'console';
  }

  get isLive(): boolean {
    return this.transportKind !== 'console';
  }

  /** True when a live send has failed within the last hour — surfaced on the dashboard. */
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
    if (this.resendKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(resendPayload(this.from, message)),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Resend ${res.status}: ${body.slice(0, 300)}`);
        }
        this.logger.log(`[email:sent:resend] To: ${to} | ${message.subject}`);
      } catch (err) {
        this.markFailed(to, message.subject, err);
      }
      return;
    }
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
      this.markFailed(to, message.subject, err);
    }
  }

  private markFailed(to: string, subject: string, err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    this.lastFailureAt = new Date();
    this.lastFailureMessage = detail;
    this.logger.error(`[email:failed] To: ${to} | ${subject} | ${detail}`);
  }
}
