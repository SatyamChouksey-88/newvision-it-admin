import { describe, expect, it } from '@jest/globals';
import { mailTransportKind, parseFromAddress, resendPayload } from './mailer.service';

describe('MailerService helpers', () => {
  it('prefers Resend over SMTP so blocked 587/465 still send', () => {
    expect(mailTransportKind({ RESEND_API_KEY: 're_test', SMTP_HOST: 'smtp.example.com' })).toBe(
      'resend',
    );
    expect(mailTransportKind({ SMTP_HOST: 'smtp.example.com' })).toBe('smtp');
    expect(mailTransportKind({})).toBe('console');
  });

  it('parses "Name <email>" From headers', () => {
    expect(parseFromAddress('NewVision IT <it@newvision.local>')).toEqual({
      name: 'NewVision IT',
      email: 'it@newvision.local',
    });
    expect(parseFromAddress('it@newvision.local')).toEqual({ email: 'it@newvision.local' });
  });

  it('builds a Resend payload with reply_to and html', () => {
    const body = resendPayload('NewVision IT <it@newvision.local>', {
      to: ['a@x.com', 'b@x.com'],
      subject: 'Ticket opened',
      text: 'plain',
      html: '<p>html</p>',
      replyTo: 'help@newvision.local',
    });
    expect(body).toMatchObject({
      from: 'NewVision IT <it@newvision.local>',
      to: ['a@x.com', 'b@x.com'],
      subject: 'Ticket opened',
      text: 'plain',
      html: '<p>html</p>',
      reply_to: 'help@newvision.local',
    });
  });
});
