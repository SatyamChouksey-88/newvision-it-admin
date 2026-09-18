import Pusher from 'pusher';

let instance: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  const appId = process.env.PUSHER_APP_ID?.trim();
  const key = process.env.PUSHER_KEY?.trim();
  const secret = process.env.PUSHER_SECRET?.trim();
  const cluster = process.env.PUSHER_CLUSTER?.trim();
  if (!appId || !key || !secret || !cluster) return null;
  if (!instance) {
    instance = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  }
  return instance;
}

export function pusherConfigured(): boolean {
  return getPusherServer() != null;
}
