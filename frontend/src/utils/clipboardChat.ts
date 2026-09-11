/** Chat composer paste: prefer real files over Office/Explorer preview bitmaps. */

const BLOCKED_EXTS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.msi',
  '.js',
  '.vbs',
  '.scr',
  '.com',
  '.pif',
  '.dll',
  '.ps1',
]);

export const CHAT_MAX_FILE_BYTES = 8 * 1024 * 1024;
export const CHAT_MAX_FILES = 8;

export type ChatPasteResult =
  | { kind: 'files'; files: File[] }
  | { kind: 'text'; text: string }
  | { kind: 'none' }
  | { kind: 'rejected'; reason: string };

function extOf(name: string): string {
  const m = name.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return m?.[1] ?? '';
}

export function isBlockedChatFile(file: File): boolean {
  return BLOCKED_EXTS.has(extOf(file.name)) || file.size > CHAT_MAX_FILE_BYTES;
}

function filesFromClipboard(data: DataTransfer): File[] {
  const fromList = Array.from(data.files ?? []);
  if (fromList.length) return fromList;
  const items: File[] = [];
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind !== 'file') continue;
    const f = item.getAsFile();
    if (f) items.push(f);
  }
  return items;
}

export function stripOfficeHtml(html: string): string {
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
  const doc = typeof DOMParser !== 'undefined' ? new DOMParser().parseFromString(withoutComments, 'text/html') : null;
  if (!doc) {
    return withoutComments
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  const blocks: string[] = [];
  const walk = (el: Element) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'li') {
      blocks.push(`- ${el.textContent?.replace(/\s+/g, ' ').trim() ?? ''}`);
      return;
    }
    if (tag === 'p' || tag === 'div' || tag === 'br') {
      const t = el.textContent?.replace(/\s+/g, ' ').trim();
      if (t) blocks.push(t);
      if (tag === 'br') blocks.push('');
      return;
    }
    for (const child of Array.from(el.children)) walk(child);
  };
  walk(doc.body);
  const text = (blocks.length ? blocks.join('\n') : doc.body.textContent ?? '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}

function isOfficeHtml(html: string): boolean {
  return /mso-|xmlns:w|xmlns:o|OfficeDocumentSettings/i.test(html);
}

export function readChatPaste(data: DataTransfer | null, opts?: { plainOnly?: boolean }): ChatPasteResult {
  if (!data) return { kind: 'none' };
  if (opts?.plainOnly) return { kind: 'none' };

  const files = filesFromClipboard(data);
  const nonImages = files.filter((f) => !f.type.startsWith('image/'));
  const images = files.filter((f) => f.type.startsWith('image/'));

  if (nonImages.length) {
    const blocked = nonImages.find(isBlockedChatFile);
    if (blocked) {
      return {
        kind: 'rejected',
        reason:
          blocked.size > CHAT_MAX_FILE_BYTES
            ? 'Attachments must be 8 MB or smaller'
            : 'That file type is not allowed',
      };
    }
    return { kind: 'files', files: nonImages.slice(0, CHAT_MAX_FILES) };
  }

  if (images.length === 1) {
    const img = images[0];
    if (img.size > CHAT_MAX_FILE_BYTES) {
      return { kind: 'rejected', reason: 'Attachments must be 8 MB or smaller' };
    }
    const ext = img.type.includes('jpeg') ? 'jpg' : img.type.includes('gif') ? 'gif' : 'png';
    const named =
      img.name && !/^image\./i.test(img.name)
        ? img
        : new File([img], `screenshot-${Date.now()}.${ext}`, { type: img.type || 'image/png' });
    return { kind: 'files', files: [named] };
  }

  const html = data.getData('text/html');
  if (html && isOfficeHtml(html)) {
    const text = stripOfficeHtml(html);
    if (text) return { kind: 'text', text };
  }

  return { kind: 'none' };
}
