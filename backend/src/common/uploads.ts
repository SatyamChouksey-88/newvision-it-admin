import { BadRequestException } from '@nestjs/common';

export const UPLOAD_MAX_FILE_BYTES = 8 * 1024 * 1024;

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
  '.html',
  '.htm',
  '.svg',
  '.jar',
  '.sh',
]);

const ALLOWED_EXTS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
]);

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

export function fileExtension(name: string): string {
  const m = name.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return m?.[1] ?? '';
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

/** Shared allow-list for chat, tickets, email-in, and procurement attachments. */
export function assertAllowedUpload(file: {
  originalname: string;
  mimetype: string;
  size: number;
}): void {
  const ext = fileExtension(file.originalname);
  if (BLOCKED_EXTS.has(ext)) throw new BadRequestException('That file type is not allowed');
  if (file.size > UPLOAD_MAX_FILE_BYTES) {
    throw new BadRequestException('Attachments must be 8 MB or smaller');
  }
  const mime = (file.mimetype ?? '').trim();
  // Always require a known extension. `application/octet-stream` is a common
  // browser default and must not become a free pass for .html / .svg / .jar.
  if (!ALLOWED_EXTS.has(ext)) throw new BadRequestException('That file type is not allowed');
  if (!mime) return;
  if (mime === 'application/octet-stream') return;
  if (!ALLOWED_MIME.has(mime) && !mime.startsWith('image/')) {
    throw new BadRequestException('That file type is not allowed');
  }
}

/** RFC 5987 Content-Disposition that cannot inject headers or scripts via the filename. */
export function contentDisposition(filename: string, inline = false): string {
  const cleaned = filename.replace(/[\r\n\\"]/g, '_').replace(/[^\w.\- ()[\]]+/g, '_');
  const safe = (cleaned.trim() || 'download').slice(0, 180);
  const encoded = encodeURIComponent(safe);
  return `${inline ? 'inline' : 'attachment'}; filename="${safe}"; filename*=UTF-8''${encoded}`;
}
