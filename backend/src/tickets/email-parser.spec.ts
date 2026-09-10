import { describe, expect, it } from '@jest/globals';
import {
  extractTicketNumber,
  isMailLoopOrAutoReply,
  parseRfc822,
  stripQuotedReply,
} from './email-parser';

describe('email-parser', () => {
  it('parses a plain new-ticket message', () => {
    const parsed = parseRfc822(`From: Asha Apte <asha.apte@newvision.local>
To: it@newvision.local
Subject: Monitor flicker
Message-ID: <new-1@mail.test>
Date: Thu, 10 Sep 2026 10:00:00 +0000

The screen flickers after sleep.
`);
    expect(parsed.fromAddress).toBe('asha.apte@newvision.local');
    expect(parsed.subject).toBe('Monitor flicker');
    expect(parsed.text).toContain('flickers');
    expect(parsed.messageId).toBe('new-1@mail.test');
  });

  it('extracts a ticket number from the subject', () => {
    expect(extractTicketNumber('Re: [TCK-000123] VPN drops')).toBe('TCK-000123');
    expect(extractTicketNumber('Hello')).toBeNull();
  });

  it('discards out-of-office auto-replies', () => {
    const parsed = parseRfc822(`From: Asha <asha.apte@newvision.local>
Subject: Out of Office: vacation
Auto-Submitted: auto-replied
Message-ID: <ooo@mail.test>

I am out of the office.
`);
    expect(isMailLoopOrAutoReply(parsed, ['it@newvision.local']).skip).toBe(true);
  });

  it('discards mail from the system mailbox', () => {
    const parsed = parseRfc822(`From: NewVision IT <it@newvision.local>
Subject: bounce
Message-ID: <loop@mail.test>

loop
`);
    expect(isMailLoopOrAutoReply(parsed, ['it@newvision.local']).reason).toBe('own-address');
  });

  it('strips a quoted reply when the cut is obvious', () => {
    const text = `Please try again.\n\nOn Tue, Asha wrote:\n> old text`;
    expect(stripQuotedReply(text)).toBe('Please try again.');
  });
});
