import { TicketPriority, TicketStatus } from '@prisma/client';

export const DEFAULT_PRIORITY_TARGETS: Record<TicketPriority, number | null> = {
  urgent: 120,
  high: 480,
  medium: 1440,
  low: 4320,
};

const SLA_ACTIVE: TicketStatus[] = ['open', 'assigned', 'in_progress', 'reopened'];

export interface SlaDecor {
  slaLabel: string | null;
  slaState: 'ok' | 'soon' | 'overdue' | 'paused' | 'met';
  slaOverdue: boolean;
}

/**
 * First-response clock: createdAt + target, minus accumulated waiting time
 * (and the current wait if status is waiting_on_employee). Stops once firstResponseAt is set.
 */
export function computeSla(
  ticket: {
    createdAt: Date;
    firstResponseAt?: Date | null;
    waitingSince?: Date | null;
    waitingTotalMinutes?: number;
    status: TicketStatus;
    priority: TicketPriority;
  },
  targetMinutes: number | null | undefined,
  now: Date = new Date(),
): SlaDecor {
  if (ticket.firstResponseAt) {
    return { slaLabel: null, slaState: 'met', slaOverdue: false };
  }
  if (ticket.status === 'waiting_on_employee') {
    return { slaLabel: 'Waiting on employee', slaState: 'paused', slaOverdue: false };
  }
  if (!targetMinutes || !SLA_ACTIVE.includes(ticket.status)) {
    return { slaLabel: null, slaState: 'ok', slaOverdue: false };
  }
  const waitingCurrent =
    ticket.waitingSince != null
      ? Math.max(0, Math.round((now.getTime() - ticket.waitingSince.getTime()) / 60_000))
      : 0;
  const waiting = (ticket.waitingTotalMinutes ?? 0) + waitingCurrent;
  const deadline = new Date(ticket.createdAt.getTime() + (targetMinutes + waiting) * 60_000);
  const deltaMin = Math.round((deadline.getTime() - now.getTime()) / 60_000);
  if (deltaMin < 0) {
    return {
      slaLabel: `Overdue by ${formatDuration(-deltaMin)}`,
      slaState: 'overdue',
      slaOverdue: true,
    };
  }
  if (deltaMin <= Math.min(60, Math.max(15, Math.round(targetMinutes * 0.15)))) {
    return {
      slaLabel: `Due in ${formatDuration(deltaMin)}`,
      slaState: 'soon',
      slaOverdue: false,
    };
  }
  return { slaLabel: `Due in ${formatDuration(deltaMin)}`, slaState: 'ok', slaOverdue: false };
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}
