const APP_URL = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173').replace(
  /\/$/,
  '',
);

export function ticketEmailDraft(ticket: {
  id: number;
  ticketNumber: string;
  subject: string;
  status: string;
  raisedBy?: { firstName?: string; email?: string } | null;
  asset?: { assetCode?: string } | null;
}) {
  const first = ticket.raisedBy?.firstName || 'there';
  const to = ticket.raisedBy?.email || '';
  const status = ticket.status.replaceAll('_', ' ');
  const assetLine = ticket.asset?.assetCode ? `Linked asset: ${ticket.asset.assetCode}\n` : '';
  const subject = `Re: [${ticket.ticketNumber}] ${ticket.subject}`;
  const body = `Hi ${first},

Thanks for raising this. We have logged ${ticket.ticketNumber} (${ticket.subject}).
Status: ${status}
${assetLine}
We will update you on this ticket. You can also view it here:
${APP_URL}/tickets/show/${ticket.id}

Regards,
NewVision IT`;
  return { to, subject, body, full: `To: ${to}\nSubject: ${subject}\n\n${body}` };
}
