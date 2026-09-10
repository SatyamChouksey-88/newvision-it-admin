/**
 * Plain, clean HTML templates for helpdesk ticket lifecycle emails — matching the app's own
 * visual language (logo, #0958D9 accent) without external CSS (email clients strip <link>/<style
 * media> support is inconsistent, so everything here is inline).
 */

const APP_URL = (process.env.PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/$/, '');
const LOGO_URL = `${APP_URL}/brand/header-logo.png`;
const ACCENT = '#0958D9';

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

function ticketUrl(ticketId: number): string {
  return `${APP_URL}/tickets/show/${ticketId}`;
}

function shell(opts: { preheader: string; heading: string; bodyHtml: string; ctaLabel: string; ctaUrl: string }): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1F1F1F;">
    <span style="display:none;max-height:0;overflow:hidden;">${opts.preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border:1px solid #E9EDF2;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px 0;">
                <img src="${LOGO_URL}" alt="NewVision" height="28" style="display:block;height:28px;width:auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 4px;">
                <h1 style="margin:0;font-size:18px;font-weight:600;letter-spacing:-0.01em;color:#1F1F1F;">${opts.heading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 4px;font-size:13.5px;line-height:1.6;color:#595959;">
                ${opts.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 28px;">
                <a href="${opts.ctaUrl}" style="display:inline-block;background:${ACCENT};color:#FFFFFF;text-decoration:none;font-size:13.5px;font-weight:500;padding:9px 18px;border-radius:6px;">${opts.ctaLabel}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 24px;border-top:1px solid #F1F4F8;font-size:11.5px;color:#94A3B8;">
                NewVision IT Helpdesk — this is an automated notification, please don't reply to this address.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function ticketCreatedEmail(args: { ticketId: number; ticketNumber: string; subject: string }): EmailContent {
  const url = ticketUrl(args.ticketId);
  return {
    subject: `We've got your ticket — ${args.ticketNumber}`,
    text: `Your ticket ${args.ticketNumber} (${args.subject}) has been logged. We'll update you as it progresses.\n\n${url}`,
    html: shell({
      preheader: `Ticket ${args.ticketNumber} logged`,
      heading: 'Your ticket has been logged',
      bodyHtml: `We've received <strong>${escapeHtml(args.ticketNumber)}</strong>: "${escapeHtml(args.subject)}". IT will update you here as it progresses.`,
      ctaLabel: 'View ticket',
      ctaUrl: url,
    }),
  };
}

export function ticketAssignedEmail(args: { ticketId: number; ticketNumber: string; subject: string }): EmailContent {
  const url = ticketUrl(args.ticketId);
  return {
    subject: `${args.ticketNumber} assigned to you`,
    text: `${args.ticketNumber} — ${args.subject} has been assigned to you.\n\n${url}`,
    html: shell({
      preheader: `${args.ticketNumber} assigned to you`,
      heading: 'A ticket was assigned to you',
      bodyHtml: `<strong>${escapeHtml(args.ticketNumber)}</strong>: "${escapeHtml(args.subject)}" is now on your queue.`,
      ctaLabel: 'Open ticket',
      ctaUrl: url,
    }),
  };
}

export function newUnassignedTicketEmail(args: { ticketId: number; ticketNumber: string; subject: string }): EmailContent {
  const url = ticketUrl(args.ticketId);
  return {
    subject: `New ticket ${args.ticketNumber}`,
    text: `A new unassigned ticket needs attention: ${args.ticketNumber} — ${args.subject}\n\n${url}`,
    html: shell({
      preheader: `New unassigned ticket ${args.ticketNumber}`,
      heading: 'New ticket needs an owner',
      bodyHtml: `<strong>${escapeHtml(args.ticketNumber)}</strong>: "${escapeHtml(args.subject)}" has come in and isn't assigned yet.`,
      ctaLabel: 'Triage now',
      ctaUrl: url,
    }),
  };
}

export function ticketCommentEmail(args: {
  ticketId: number;
  ticketNumber: string;
  authorLabel: string;
  excerpt: string;
}): EmailContent {
  const url = ticketUrl(args.ticketId);
  return {
    subject: `New comment on ${args.ticketNumber}`,
    text: `${args.authorLabel} commented on ${args.ticketNumber}:\n\n${args.excerpt}\n\n${url}`,
    html: shell({
      preheader: `New comment on ${args.ticketNumber}`,
      heading: 'New comment on your ticket',
      bodyHtml: `<strong>${escapeHtml(args.authorLabel)}</strong> wrote on <strong>${escapeHtml(args.ticketNumber)}</strong>:<br/><br/>"${escapeHtml(args.excerpt)}"`,
      ctaLabel: 'Reply',
      ctaUrl: url,
    }),
  };
}

export function ticketStatusChangedEmail(args: {
  ticketId: number;
  ticketNumber: string;
  status: string;
}): EmailContent {
  const url = ticketUrl(args.ticketId);
  const statusLabel = args.status.replaceAll('_', ' ');
  return {
    subject: `${args.ticketNumber} is now ${statusLabel}`,
    text: `${args.ticketNumber} changed status to ${statusLabel}.\n\n${url}`,
    html: shell({
      preheader: `${args.ticketNumber} is now ${statusLabel}`,
      heading: `Ticket status: ${statusLabel}`,
      bodyHtml: `<strong>${escapeHtml(args.ticketNumber)}</strong> is now <strong>${escapeHtml(statusLabel)}</strong>.`,
      ctaLabel: 'View ticket',
      ctaUrl: url,
    }),
  };
}

export function ratingPromptEmail(args: { ticketId: number; ticketNumber: string }): EmailContent {
  const url = ticketUrl(args.ticketId);
  return {
    subject: `How did we do on ${args.ticketNumber}?`,
    text: `Please rate this resolution (1-5) from the ticket page.\n\n${url}`,
    html: shell({
      preheader: `Rate the resolution of ${args.ticketNumber}`,
      heading: 'How did we do?',
      bodyHtml: `Your ticket <strong>${escapeHtml(args.ticketNumber)}</strong> was resolved. A quick 1–5 rating helps IT keep improving.`,
      ctaLabel: 'Rate resolution',
      ctaUrl: url,
    }),
  };
}

export function dailyDigestEmail(args: {
  created: number;
  assignedUpdates: number;
  stillOpen: number;
}): EmailContent {
  const url = `${APP_URL}/tickets`;
  const text = `${args.created} new tickets in the last day.\n${args.assignedUpdates} updates on tickets assigned to you.\n${args.stillOpen} still open and assigned to you.`;
  return {
    subject: 'NewVision daily ticket digest',
    text: `${text}\n\n${url}`,
    html: shell({
      preheader: 'Your daily ticket digest',
      heading: 'Your daily ticket digest',
      bodyHtml: `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
          <tr><td style="padding:4px 0;">🆕 <strong>${args.created}</strong> new tickets in the last day</td></tr>
          <tr><td style="padding:4px 0;">🔄 <strong>${args.assignedUpdates}</strong> updates on tickets assigned to you</td></tr>
          <tr><td style="padding:4px 0;">📌 <strong>${args.stillOpen}</strong> still open and assigned to you</td></tr>
        </table>`,
      ctaLabel: 'Open queue',
      ctaUrl: url,
    }),
  };
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
