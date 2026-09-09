import { describe, expect, it } from '@jest/globals';
import {
  buildWebhookPayload,
  isWebhookEvent,
  signWebhookBody,
  verifyWebhookSignature,
} from './signature';

describe('webhook signatures', () => {
  it('round-trips HMAC-SHA256 and rejects a tampered body', () => {
    const secret = 's3cret';
    const body = '{"event":"asset.created"}';
    const sig = signWebhookBody(secret, body);
    expect(verifyWebhookSignature(secret, body, sig)).toBe(true);
    expect(verifyWebhookSignature(secret, '{"event":"nope"}', sig)).toBe(false);
    expect(verifyWebhookSignature('other', body, sig)).toBe(false);
  });

  it('accepts only the two documented event names', () => {
    expect(isWebhookEvent('asset.created')).toBe(true);
    expect(isWebhookEvent('asset.status_changed')).toBe(true);
    expect(isWebhookEvent('asset.deleted')).toBe(false);
  });

  it('builds a payload with an ISO timestamp', () => {
    const at = new Date('2026-09-09T12:00:00.000Z');
    expect(buildWebhookPayload('asset.created', { id: 1 }, at)).toEqual({
      event: 'asset.created',
      occurredAt: '2026-09-09T12:00:00.000Z',
      data: { id: 1 },
    });
  });
});
