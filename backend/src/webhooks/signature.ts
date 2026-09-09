import { createHmac, timingSafeEqual } from 'node:crypto';

export const WEBHOOK_EVENTS = ['asset.created', 'asset.status_changed'] as const;
export type WebhookEventName = (typeof WEBHOOK_EVENTS)[number];

export function isWebhookEvent(value: string): value is WebhookEventName {
  return (WEBHOOK_EVENTS as readonly string[]).includes(value);
}

export function signWebhookBody(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

export function verifyWebhookSignature(secret: string, body: string, signature: string): boolean {
  const expected = signWebhookBody(secret, body);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function buildWebhookPayload(
  event: WebhookEventName,
  data: Record<string, unknown>,
  occurredAt: Date = new Date(),
): { event: WebhookEventName; occurredAt: string; data: Record<string, unknown> } {
  return { event, occurredAt: occurredAt.toISOString(), data };
}
