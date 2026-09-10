import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EmailInboxService } from './email-inbox.service';

function eml(headers: string, body: string) {
  return `${headers}\n\n${body}\n`;
}

describe('EmailInboxService.processRaw', () => {
  const prisma: any = {
    ticketMessage: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    employee: { findFirst: jest.fn() },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    ticketCategory: { findFirst: jest.fn() },
    supportTicket: { findUnique: jest.fn() },
    notification: { createMany: jest.fn() },
    emailIngestState: { upsert: jest.fn() },
  };
  const tickets: any = {
    create: jest.fn(),
    addPublicOrInternalComment: jest.fn(),
  };
  const mailer: any = { send: jest.fn() };
  const svc = new EmailInboxService(prisma, tickets, mailer);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.ticketMessage.findUnique.mockResolvedValue(null);
    prisma.ticketMessage.findFirst.mockResolvedValue(null);
    prisma.ticketMessage.create.mockResolvedValue({});
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.findFirst.mockResolvedValue({
      id: 1,
      email: 'superadmin@newvision.local',
      fullName: 'Super',
      employeeId: null,
      role: { name: 'SUPER_ADMIN' },
    });
    prisma.ticketCategory.findFirst.mockResolvedValue({ id: 9, code: 'general' });
    prisma.employee.findFirst.mockResolvedValue({
      id: 3,
      email: 'asha.apte@newvision.local',
    });
    tickets.create.mockResolvedValue({ id: 10, ticketNumber: 'TCK-000010' });
  });

  it('creates a ticket from a known employee', async () => {
    const raw = eml(
      `From: Asha Apte <asha.apte@newvision.local>
To: it@newvision.local
Subject: Laptop fan is loud
Message-ID: <new-known@mail.test>`,
      'The fan ramps up even when idle.',
    );
    const result = await svc.processRaw(raw);
    expect(result.action).toBe('ticket');
    expect(tickets.create).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'email',
        raisedByEmployeeId: 3,
        unmatchedSender: null,
      }),
      expect.anything(),
    );
  });

  it('matches a reply via In-Reply-To', async () => {
    prisma.ticketMessage.findFirst.mockResolvedValue({
      ticket: {
        id: 22,
        ticketNumber: 'TCK-000022',
        subject: 'VPN',
        status: 'assigned',
        raisedById: 3,
        assignedToId: 5,
        firstResponseAt: null,
        waitingSince: null,
        waitingTotalMinutes: 0,
      },
    });
    const raw = eml(
      `From: Asha Apte <asha.apte@newvision.local>
Subject: Re: [TCK-000022] VPN
Message-ID: <reply-hdr@mail.test>
In-Reply-To: <orig@newvision.tickets>
References: <orig@newvision.tickets>`,
      'Still broken after reboot.',
    );
    const result = await svc.processRaw(raw);
    expect(result.action).toBe('comment');
    expect(tickets.addPublicOrInternalComment).toHaveBeenCalled();
    expect(tickets.create).not.toHaveBeenCalled();
  });

  it('matches a reply via subject ticket number when headers are stripped', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue({
      id: 23,
      ticketNumber: 'TCK-000023',
      subject: 'VPN',
      status: 'assigned',
      raisedById: 3,
      assignedToId: 5,
      firstResponseAt: null,
      waitingSince: null,
      waitingTotalMinutes: 0,
    });
    const raw = eml(
      `From: Asha Apte <asha.apte@newvision.local>
Subject: Re: [TCK-000023] VPN
Message-ID: <reply-subj@mail.test>`,
      'Trying again from home.',
    );
    const result = await svc.processRaw(raw);
    expect(result.action).toBe('comment');
    expect(prisma.supportTicket.findUnique).toHaveBeenCalledWith({
      where: { ticketNumber: 'TCK-000023' },
    });
  });

  it('ignores a duplicate Message-ID', async () => {
    prisma.ticketMessage.findUnique.mockResolvedValue({ id: 1, messageId: 'dup@mail.test' });
    const raw = eml(
      `From: Asha <asha.apte@newvision.local>
Subject: Hi
Message-ID: <dup@mail.test>`,
      'again',
    );
    const result = await svc.processRaw(raw);
    expect(result).toEqual({ action: 'duplicate', messageId: 'dup@mail.test' });
    expect(tickets.create).not.toHaveBeenCalled();
  });

  it('discards an out-of-office auto-reply', async () => {
    const raw = eml(
      `From: Asha <asha.apte@newvision.local>
Subject: Out of Office
Auto-Submitted: auto-replied
Message-ID: <ooo@mail.test>`,
      'I am away.',
    );
    const result = await svc.processRaw(raw);
    expect(result.action).toBe('ignored');
    expect(tickets.create).not.toHaveBeenCalled();
  });

  it('flags an unrecognized sender instead of creating an employee', async () => {
    prisma.employee.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 99, email: 'placeholder@newvision.local' });
    prisma.user.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 1,
        email: 'superadmin@newvision.local',
        fullName: 'Super',
        employeeId: null,
        role: { name: 'SUPER_ADMIN' },
      });
    const raw = eml(
      `From: Stranger <unknown@example.com>
To: it@newvision.local
Subject: Need a mouse
Message-ID: <stranger@mail.test>`,
      'Can I get a mouse?',
    );
    const result = await svc.processRaw(raw);
    expect(result.action).toBe('ticket');
    expect(tickets.create).toHaveBeenCalledWith(
      expect.objectContaining({
        unmatchedSender: 'unknown@example.com',
        channel: 'email',
      }),
      expect.anything(),
    );
  });
});
