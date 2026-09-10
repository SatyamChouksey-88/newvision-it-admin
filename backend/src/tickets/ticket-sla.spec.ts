import { describe, expect, it } from '@jest/globals';
import { computeSla } from './ticket-sla';

describe('ticket SLA (first-response clock)', () => {
  const createdAt = new Date('2026-09-10T08:00:00.000Z');

  it('marks overdue past the target', () => {
    const sla = computeSla(
      { createdAt, status: 'open', priority: 'urgent', waitingTotalMinutes: 0 },
      120,
      new Date('2026-09-10T11:00:00.000Z'),
    );
    expect(sla.slaState).toBe('overdue');
    expect(sla.slaOverdue).toBe(true);
    expect(sla.slaLabel).toMatch(/Overdue by 1h/);
  });

  it('pauses while waiting on the employee', () => {
    const sla = computeSla(
      {
        createdAt,
        status: 'waiting_on_employee',
        priority: 'high',
        waitingSince: new Date('2026-09-10T09:00:00.000Z'),
        waitingTotalMinutes: 0,
      },
      480,
      new Date('2026-09-10T18:00:00.000Z'),
    );
    expect(sla.slaState).toBe('paused');
    expect(sla.slaOverdue).toBe(false);
  });

  it('stops after first response', () => {
    const sla = computeSla(
      {
        createdAt,
        status: 'in_progress',
        priority: 'urgent',
        firstResponseAt: new Date('2026-09-10T08:30:00.000Z'),
      },
      120,
      new Date('2026-09-10T18:00:00.000Z'),
    );
    expect(sla.slaState).toBe('met');
    expect(sla.slaLabel).toBeNull();
  });
});
