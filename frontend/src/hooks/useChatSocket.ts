import { useCallback, useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from '../providers/axios';
import { readSession, TOKEN_KEY } from '../providers/session';

function wsOrigin(): string {
  return API_URL.replace(/\/api\/?$/, '');
}

export function useChatSocket(
  enabled: boolean,
  handlers: {
    onMessageNew?: (msg: unknown) => void;
    onMessageUpdated?: (msg: unknown) => void;
    onMessageDeleted?: (msg: unknown) => void;
    onUnread?: (payload: unknown) => void;
    onPresence?: (payload: { userId: number; status: string }) => void;
    onTyping?: (payload: { channelId: number; threadId?: number | null; userId: number }) => void;
    onReconnect?: () => void;
  },
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const token = readSession(TOKEN_KEY);
    if (!token) return;
    const socket = io(`${wsOrigin()}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;
    socket.on('message:new', (p) => handlersRef.current.onMessageNew?.(p));
    socket.on('message:updated', (p) => handlersRef.current.onMessageUpdated?.(p));
    socket.on('message:deleted', (p) => handlersRef.current.onMessageDeleted?.(p));
    socket.on('unread:changed', (p) => handlersRef.current.onUnread?.(p));
    socket.on('presence', (p) => handlersRef.current.onPresence?.(p));
    socket.on('typing', (p) => handlersRef.current.onTyping?.(p));
    socket.io.on('reconnect', () => handlersRef.current.onReconnect?.());
    const ping = window.setInterval(() => {
      if (socket.connected) socket.emit('presence:ping');
    }, 30_000);
    return () => {
      window.clearInterval(ping);
      socket.removeAllListeners();
      socket.close();
      socketRef.current = null;
    };
  }, [enabled]);

  const emitTyping = useCallback((channelId: number, threadId?: number | null) => {
    socketRef.current?.emit('typing', { channelId, threadId });
  }, []);
  const join = useCallback((channelId: number) => {
    socketRef.current?.emit('join', { channelId });
  }, []);
  const setMode = useCallback((mode: string) => {
    socketRef.current?.emit('presence:set', { mode });
  }, []);

  return { emitTyping, join, setMode };
}
