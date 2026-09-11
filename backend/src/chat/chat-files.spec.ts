import { describe, expect, it } from '@jest/globals';
import { assertAllowedChatFile, fileExtension, isImageMime } from './chat-files';

describe('assertAllowedChatFile', () => {
  it('blocks executables and oversized files', () => {
    expect(() =>
      assertAllowedChatFile({
        originalname: 'payload.exe',
        mimetype: 'application/octet-stream',
        size: 10,
      }),
    ).toThrow(/not allowed/);
    expect(() =>
      assertAllowedChatFile({
        originalname: 'shot.png',
        mimetype: 'image/png',
        size: 9 * 1024 * 1024,
      }),
    ).toThrow(/8 MB/);
  });

  it('allows images and office docs under the size cap', () => {
    expect(() =>
      assertAllowedChatFile({ originalname: 'snip.png', mimetype: 'image/png', size: 1200 }),
    ).not.toThrow();
    expect(() =>
      assertAllowedChatFile({
        originalname: 'brief.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1200,
      }),
    ).not.toThrow();
    expect(() =>
      assertAllowedChatFile({ originalname: 'legacy.doc', mimetype: 'application/msword', size: 800 }),
    ).not.toThrow();
    expect(() =>
      assertAllowedChatFile({ originalname: 'brief.docx', mimetype: '', size: 800 }),
    ).not.toThrow();
    expect(fileExtension('Report.PDF')).toBe('.pdf');
    expect(isImageMime('image/webp')).toBe(true);
  });
});
