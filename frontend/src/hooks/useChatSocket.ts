import type { Channel, PresenceChannel } from 'pusher-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  messageChannelForConversation,
  presenceChannelName,
  STAFF_PRESENCE_CHANNEL,
  userNotifyChannelName,
} from '../lib/pusher-channels';
import { getPusherClient, resetPusherClient } from '../lib/pusher-client';
import { httpClient } from '../providers/axios';
import { readSession, TOKEN_KEY } from '../providers/session';

export type ChatConnectionState = 'connected' | 'connecting' | 'disconnected' | 'unavailable';

type JoinTarget = {
  id: number;
  type: string;
  visibility: string;
  otherUserId: number | null;
};

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
  identityUserId?: number,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const [connectionState, setConnectionState] = useState<ChatConnectionState>('unavailable');
  const messageChannelRef = useRef<Channel | null>(null);
  const presenceChannelRef = useRef<PresenceChannel | null>(null);
  const userChannelRef = useRef<Channel | null>(null);
  const staffPresenceRef = useRef<PresenceChannel | null>(null);
  const activeJoinRef = useRef<JoinTarget | null>(null);
  const wasConnected = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const token = readSession(TOKEN_KEY);
    if (!token) return;

    const pusher = getPusherClient(() => readSession(TOKEN_KEY));
    if (!pusher) {
      setConnectionState('unavailable');
      return;
    }

    const onState = (states: { current: string }) => {
      if (states.current === 'connected') {
        setConnectionState('connected');
        if (wasConnected.current) handlersRef.current.onReconnect?.();
        wasConnected.current = true;
      } else if (states.current === 'connecting') {
        setConnectionState('connecting');
      } else {
        setConnectionState('disconnected');
      }
    };
    pusher.connection.bind('state_change', onState);
    if (pusher.connection.state === 'connected') {
      setConnectionState('connected');
      wasConnected.current = true;
    }

    if (identityUserId) {
      const userCh = pusher.subscribe(userNotifyChannelName(identityUserId));
      userCh.bind('unread-changed', (p: unknown) => handlersRef.current.onUnread?.(p));
      userChannelRef.current = userCh;
    }

    const staffCh = pusher.subscribe(STAFF_PRESENCE_CHANNEL) as PresenceChannel;
    staffCh.bind('presence', (p: { userId: number; status: string }) =>
      handlersRef.current.onPresence?.(p),
    );
    staffPresenceRef.current = staffCh;

    const ping = window.setInterval(() => {
      if (pusher.connection.state === 'connected') {
        void httpClient.post('/chat/presence/ping').catch(() => undefined);
      }
    }, 30_000);

    return () => {
      window.clearInterval(ping);
      pusher.connection.unbind('state_change', onState);
      messageChannelRef.current?.unbind_all();
      presenceChannelRef.current?.unbind_all();
      userChannelRef.current?.unbind_all();
      staffPresenceRef.current?.unbind_all();
      resetPusherClient();
      messageChannelRef.current = null;
      presenceChannelRef.current = null;
      userChannelRef.current = null;
      staffPresenceRef.current = null;
      setConnectionState('unavailable');
    };
  }, [enabled, identityUserId]);

  const bindMessageChannel = useCallback(
    (pusher: NonNullable<ReturnType<typeof getPusherClient>>, name: string) => {
      messageChannelRef.current?.unbind_all();
      if (messageChannelRef.current) pusher.unsubscribe(messageChannelRef.current.name);

      const ch = pusher.subscribe(name);
      ch.bind('new-message', (p: unknown) => handlersRef.current.onMessageNew?.(p));
      ch.bind('message-updated', (p: unknown) => handlersRef.current.onMessageUpdated?.(p));
      ch.bind('message-deleted', (p: unknown) => handlersRef.current.onMessageDeleted?.(p));
      ch.bind('reaction-added', (p: unknown) => handlersRef.current.onMessageUpdated?.(p));
      messageChannelRef.current = ch;
    },
    [],
  );

  const bindPresenceChannel = useCallback(
    (pusher: NonNullable<ReturnType<typeof getPusherClient>>, channelId: number) => {
      presenceChannelRef.current?.unbind_all();
      if (presenceChannelRef.current) pusher.unsubscribe(presenceChannelRef.current.name);

      const pres = pusher.subscribe(presenceChannelName(channelId)) as PresenceChannel;
      pres.bind('client-typing', (p: { channelId: number; threadId?: number | null; userId: number }) => {
        handlersRef.current.onTyping?.(p);
      });
      presenceChannelRef.current = pres;
    },
    [],
  );

  const join = useCallback(
    (target: JoinTarget | null) => {
      activeJoinRef.current = target;
      const token = readSession(TOKEN_KEY);
      if (!token || !target || !identityUserId) return;
      const pusher = getPusherClient(() => readSession(TOKEN_KEY));
      if (!pusher) return;

      const msgName = messageChannelForConversation(target, identityUserId);
      bindMessageChannel(pusher, msgName);
      bindPresenceChannel(pusher, target.id);
    },
    [bindMessageChannel, bindPresenceChannel, identityUserId],
  );

  const emitTyping = useCallback(
    (channelId: number, threadId?: number | null) => {
      const pres = presenceChannelRef.current;
      if (!pres || !identityUserId) return;
      pres.trigger('client-typing', {
        channelId,
        threadId: threadId ?? null,
        userId: identityUserId,
      });
    },
    [identityUserId],
  );

  const setMode = useCallback((mode: string) => {
    void httpClient.post('/chat/presence', { mode }).catch(() => undefined);
  }, []);

  return { emitTyping, join, setMode, connectionState };
}
