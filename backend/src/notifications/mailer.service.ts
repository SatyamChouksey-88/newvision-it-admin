import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface MailMessage {
  to: string | string[];
  subject: string;
  text: string;
}

/**
 * Sends email via SMTP when configured (SMTP_HOST/PORT/USER/PASS), otherwise logs the
 * message to the console. Console fallback is the documented default for local dev
 * (see backend/.env.example) so warranty alerts are observable without a mail server.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

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

  async send(message: MailMessage): Promise<void> {
    const to = Array.isArray(message.to) ? message.to.join(', ') : message.to;
    if (!this.transporter) {
      this.logger.log(`[email:console] To: ${to} | ${message.subject}\n${message.text}`);
      return;
    }
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: message.subject,
      text: message.text,
    });
    this.logger.log(`[email:sent] To: ${to} | ${message.subject}`);
  }
}
