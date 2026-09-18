import Pusher from 'pusher-js';
import { API_URL } from '../providers/axios';

let shared: Pusher | null = null;

export function getPusherClient(getToken: () => string | null): Pusher | null {
  const key = (import.meta.env.VITE_PUSHER_KEY as string | undefined)?.trim();
  const cluster = (import.meta.env.VITE_PUSHER_CLUSTER as string | undefined)?.trim();
  if (!key || !cluster) return null;
  if (!shared) {
    shared = new Pusher(key, {
      cluster,
      authorizer: (channel) => ({
        authorize: (socketId, callback) => {
          const token = getToken();
          fetch(`${API_URL}/pusher/auth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
            credentials: 'include',
          })
            .then(async (res) => {
              if (!res.ok) {
                const text = await res.text();
                callback(new Error(text || res.statusText), null);
                return;
              }
              callback(null, await res.json());
            })
            .catch((err) => callback(err instanceof Error ? err : new Error(String(err)), null));
        },
      }),
    });
  }
  return shared;
}

export function resetPusherClient(): void {
  if (shared) {
    shared.disconnect();
    shared = null;
  }
}
