import { describe, expect, it } from '@jest/globals';
import { TicketStatus } from '@prisma/client';
import { canTransitionTicket } from './tickets.lifecycle';

describe('ticket lifecycle', () => {
  it('allows the documented happy path and reopen', () => {
    expect(canTransitionTicket('open', 'assigned')).toBe(true);
    expect(canTransitionTicket('assigned', 'in_progress')).toBe(true);
    expect(canTransitionTicket('in_progress', 'resolved')).toBe(true);
    expect(canTransitionTicket('resolved', 'closed')).toBe(true);
    expect(canTransitionTicket('closed', 'reopened')).toBe(true);
    expect(canTransitionTicket('reopened', 'assigned')).toBe(true);
    expect(canTransitionTicket('resolved', 'reopened')).toBe(true);
    expect(canTransitionTicket('in_progress', 'waiting_on_employee')).toBe(true);
    expect(canTransitionTicket('waiting_on_employee', 'in_progress')).toBe(true);
  });

  it('blocks illegal jumps', () => {
    expect(canTransitionTicket('open', 'resolved')).toBe(false);
    expect(canTransitionTicket('closed', 'in_progress')).toBe(false);
    expect(canTransitionTicket('assigned' as TicketStatus, 'closed')).toBe(false);
  });
});
