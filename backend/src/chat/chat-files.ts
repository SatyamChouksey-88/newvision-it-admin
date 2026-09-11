import { BadRequestException } from '@nestjs/common';

export const CHAT_MAX_FILE_BYTES = 8 * 1024 * 1024;

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
  'application/octet-stream',
]);

export function fileExtension(name: string): string {
  const m = name.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return m?.[1] ?? '';
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

export function assertAllowedChatFile(file: {
  originalname: string;
  mimetype: string;
  size: number;
}): void {
  const ext = fileExtension(file.originalname);
  if (BLOCKED_EXTS.has(ext)) throw new BadRequestException('That file type is not allowed');
  if (file.size > CHAT_MAX_FILE_BYTES)
    throw new BadRequestException('Attachments must be 8 MB or smaller');
  const mime = (file.mimetype ?? '').trim();
  if (!mime) {
    if (!ALLOWED_EXTS.has(ext)) throw new BadRequestException('That file type is not allowed');
    return;
  }
  if (!ALLOWED_MIME.has(mime) && !mime.startsWith('image/')) {
    throw new BadRequestException('That file type is not allowed');
  }
}
