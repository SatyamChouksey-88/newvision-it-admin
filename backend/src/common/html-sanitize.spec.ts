import { describe, expect, it } from '@jest/globals';
import { sanitizeInboundHtml } from './html-sanitize';

describe('sanitizeInboundHtml', () => {
  it('strips script, event handlers, and javascript URLs', () => {
    const dirty =
      '<p onclick="alert(1)">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>';
    const clean = sanitizeInboundHtml(dirty);
    expect(clean).not.toMatch(/script/i);
    expect(clean).not.toMatch(/onclick/i);
    expect(clean).not.toMatch(/javascript:/i);
    expect(clean).toContain('<p');
  });
});
