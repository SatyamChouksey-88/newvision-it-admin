/**
 * Lightweight RFC-822 parser for helpdesk email-in. Handles the simple text/plain
 * (and first text/plain part of multipart/mixed) messages we receive from IMAP or
 * an ingest webhook. Intentionally not a full MIME library — if a body cannot be
 * stripped confidently we keep the full text rather than drop content.
 */

export interface ParsedEmail {
  messageId: string;
  inReplyTo?: string;
  references: string[];
  from: string;
  fromAddress: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  headers: Record<string, string>;
  autoSubmitted?: string;
}

const TICKET_RE = /\[?(TCK-\d{6,})\]?/i;

export function parseRfc822(raw: string): ParsedEmail {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const split = normalized.indexOf('\n\n');
  const headerBlock = split === -1 ? normalized : normalized.slice(0, split);
  const body = split === -1 ? '' : normalized.slice(split + 2);
  const headers = unfoldHeaders(headerBlock);

  const contentType = (headers['content-type'] ?? 'text/plain').toLowerCase();
  let text = body;
  let html: string | undefined;
  if (contentType.includes('multipart/')) {
    const extracted = extractMultipartText(body, headers['content-type'] ?? '');
    text = extracted.text;
    html = extracted.html;
  } else if (contentType.includes('text/html')) {
    html = body;
    text = stripHtml(body);
  } else {
    text = decodeBody(body, headers['content-transfer-encoding']);
  }

  const messageId =
    cleanAngle(headers['message-id']) ||
    `generated-${hash32(normalized)}@newvision.local`;

  return {
    messageId,
    inReplyTo: cleanAngle(headers['in-reply-to']) || undefined,
    references: splitRefs(headers.references),
    from: headers.from ?? '',
    fromAddress: extractAddress(headers.from ?? ''),
    to: headers.to ?? '',
    subject: headers.subject ?? '(no subject)',
    text: text.trim(),
    html,
    headers,
    autoSubmitted: headers['auto-submitted'] || headers['x-autoreply'] || headers['x-autorespond'],
  };
}

export function extractTicketNumber(subject: string): string | null {
  const m = subject.match(TICKET_RE);
  return m ? m[1].toUpperCase() : null;
}

export function isMailLoopOrAutoReply(
  parsed: ParsedEmail,
  ownAddresses: string[],
): { skip: boolean; reason?: string } {
  const from = parsed.fromAddress.toLowerCase();
  const own = ownAddresses.map((a) => a.toLowerCase()).filter(Boolean);
  if (from && own.includes(from)) {
    return { skip: true, reason: 'own-address' };
  }
  const auto = (parsed.autoSubmitted ?? '').toLowerCase();
  if (auto && auto !== 'no') {
    return { skip: true, reason: 'auto-submitted' };
  }
  const precedence = (parsed.headers.precedence ?? '').toLowerCase();
  if (precedence === 'bulk' || precedence === 'list' || precedence === 'junk') {
    return { skip: true, reason: 'precedence-bulk' };
  }
  const subj = parsed.subject.toLowerCase();
  if (
    /^(auto:?\s*)?(out of office|automatic reply|autoreply|auto-reply|undeliverable|delivery status)/i.test(
      parsed.subject,
    ) ||
    subj.includes('out of office') ||
    subj.includes('automatic reply')
  ) {
    return { skip: true, reason: 'ooo-subject' };
  }
  if (/\b(out of office|automatic reply|this is an auto[- ]?reply)\b/i.test(parsed.text.slice(0, 400))) {
    return { skip: true, reason: 'ooo-body' };
  }
  return { skip: false };
}

/** Strip quoted reply / common signature if the cut is obvious; otherwise keep full text. */
export function stripQuotedReply(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const cut = lines.findIndex(
    (l) =>
      /^On .+ wrote:$/i.test(l.trim()) ||
      /^-----Original Message-----/i.test(l.trim()) ||
      /^_{5,}$/.test(l.trim()) ||
      /^From:\s.+/i.test(l.trim()) && lines[lines.indexOf(l) + 1]?.startsWith('Sent:'),
  );
  const head = cut > 0 ? lines.slice(0, cut) : lines;
  const withoutQuotes = head.filter((l) => !l.startsWith('>'));
  const sig = withoutQuotes.findIndex((l) => l.trim() === '--');
  const trimmed = (sig > 0 ? withoutQuotes.slice(0, sig) : withoutQuotes).join('\n').trim();
  return trimmed.length >= 8 ? trimmed : text.trim();
}

export function extractAddress(from: string): string {
  const angle = from.match(/<([^>]+)>/);
  if (angle) return angle[1].trim().toLowerCase();
  const bare = from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return bare ? bare[0].toLowerCase() : from.trim().toLowerCase();
}

function unfoldHeaders(block: string): Record<string, string> {
  const folded = block.replace(/\n[ \t]+/g, ' ');
  const out: Record<string, string> = {};
  for (const line of folded.split('\n')) {
    const i = line.indexOf(':');
    if (i < 1) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    const value = line.slice(i + 1).trim();
    out[key] = out[key] ? `${out[key]} ${value}` : value;
  }
  return out;
}

function cleanAngle(v?: string): string {
  if (!v) return '';
  const m = v.match(/<([^>]+)>/);
  return (m ? m[1] : v).trim();
}

function splitRefs(v?: string): string[] {
  if (!v) return [];
  return [...v.matchAll(/<([^>]+)>/g)].map((m) => m[1]).filter(Boolean);
}

function decodeBody(body: string, encoding?: string): string {
  const enc = (encoding ?? '').toLowerCase();
  if (enc === 'base64') {
    try {
      return Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8');
    } catch {
      return body;
    }
  }
  if (enc === 'quoted-printable') {
    return body
      .replace(/=\n/g, '')
      .replace(/=([0-9A-F]{2})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
  }
  return body;
}

function extractMultipartText(
  body: string,
  contentType: string,
): { text: string; html?: string } {
  const boundaryMatch = contentType.match(/boundary="?([^";]+)"?/i);
  if (!boundaryMatch) return { text: body };
  const boundary = boundaryMatch[1];
  const parts = body.split(new RegExp(`--${escapeRegExp(boundary)}`));
  let text = '';
  let html: string | undefined;
  for (const part of parts) {
    if (!part.trim() || part.trim() === '--') continue;
    const parsed = parseRfc822(`X-Part: 1\n${part.trimStart()}`);
    const ct = (parsed.headers['content-type'] ?? '').toLowerCase();
    if (ct.includes('text/plain') && !text) text = parsed.text;
    if (ct.includes('text/html') && !html) html = parsed.html ?? parsed.text;
  }
  return { text: text || stripHtml(html ?? body), html };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hash32(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
