import { TicketStatus } from '@prisma/client';

const NEXT: Record<TicketStatus, TicketStatus[]> = {
  open: ['assigned', 'in_progress', 'closed'],
  assigned: ['in_progress', 'open', 'resolved'],
  in_progress: ['assigned', 'resolved'],
  resolved: ['closed', 'reopened'],
  reopened: ['assigned', 'in_progress', 'open'],
  closed: ['reopened'],
};

export function allowedTicketTransitions(from: TicketStatus): TicketStatus[] {
  return NEXT[from] ?? [];
}

export function canTransitionTicket(from: TicketStatus, to: TicketStatus): boolean {
  return from === to || allowedTicketTransitions(from).includes(to);
}
