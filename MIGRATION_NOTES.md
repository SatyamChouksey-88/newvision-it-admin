# Pusher + cron migration notes

Migration branch: `migrate/pusher-realtime-and-cron-worker` (NewVision IT Admin).

## Why

Hostinger Business Web Hosting managed Node.js apps do not support persistent WebSocket servers or long-running background workers. Chat real-time delivery now uses **Pusher Channels**; inbound helpdesk mail polling is triggered by **HTTP cron** instead of `@nestjs/schedule`.

## Environment variables

### Backend (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `PUSHER_APP_ID` | Pusher app ID |
| `PUSHER_KEY` | Pusher key (same as client) |
| `PUSHER_SECRET` | Pusher secret (server only) |
| `PUSHER_CLUSTER` | e.g. `ap2` |
| `CRON_SECRET` | Shared secret for `X-Cron-Secret` on the email poll endpoint |

### Frontend (Vite build-time)

| Variable | Purpose |
|----------|---------|
| `VITE_PUSHER_KEY` | Pusher public key |
| `VITE_PUSHER_CLUSTER` | Same cluster as backend |

Enable **client events** (`client_messages`) on the Pusher app dashboard so typing (`client-typing` on `presence-channel-*`) works.

## Pusher channel map

| Concept | Pusher channel | Auth |
|---------|----------------|------|
| Public team channel messages | `channel-<channelId>` | Public |
| Private team/group messages | `private-channel-<channelId>` | Private |
| DM messages | `private-dm-<minUserId>-<maxUserId>` | Private |
| Channel viewers + typing | `presence-channel-<channelId>` | Presence |
| Staff directory presence | `presence-staff` | Presence |
| Per-user unread badges | `private-user-<userId>` | Private |

Server events: `new-message`, `message-updated`, `message-deleted`, `reaction-added`, `unread-changed`, `presence`, `channel-updated`.

Auth: `POST /api/pusher/auth` (staff JWT). Membership is checked in the database before signing.

## Email ticket cron (Hostinger hPanel)

The Nest global prefix is `api`, so the poll URL is:

`https://<your-domain>/api/internal/cron/poll-email-tickets`

Example cron (every 5 minutes):

```bash
curl -sS -X POST \
  -H "X-Cron-Secret: $CRON_SECRET" \
  "https://<your-domain>/api/internal/cron/poll-email-tickets"
```

Requires `IMAP_*` variables and `CRON_SECRET`. The previous `@Cron` IMAP loop was removed; only this endpoint (or manual `POST /api/email-in/poll` as Super Admin) runs polling.

## Autonomous decisions

1. **API prefix on cron URL** — Documented as `/api/internal/...` because `configureApp` sets `setGlobalPrefix('api')`.
2. **Private groups** — Non-public channels use `private-channel-<id>` (not in the original bullet list but required for private team rooms).
3. **Staff-wide presence** — Added `presence-staff` because the UI relied on global `presence` events previously broadcast via Socket.io to all connections.
4. **User notify channel** — `private-user-<userId>` carries `unread-changed` (replacing Socket.io `user:<id>` rooms).
5. **Server-side “online”** — Without socket connection tracking, `ChatPresenceService` treats users as connected for ~90s after heartbeat/ping (REST), matching the Pusher client ping interval.
6. **Reactions** — `toggleReaction` emits `reaction-added` only (not `message-updated`); the client binds both to the same UI merge path.
7. **E2E realtime** — Socket.io delivery test replaced with Pusher auth membership test; full delivery needs Pusher credentials in CI.

## Local test

1. Create a Pusher Channels app (free tier).
2. Set backend and frontend env vars above.
3. Run API + Vite; open `/chat` with two staff browsers; post a message and confirm `new-message` on the channel.
