# Pusher + cron migration notes

Migration branch: `migrate/pusher-realtime-and-cron-worker` ÃÂÃÂ· PR: https://github.com/SatyamChouksey-88/newvision-it-admin/pull/2

---

## Before you go live ÃÂ¢ÃÂÃÂ manual / external dependencies

| Item | Who | Notes |
|------|-----|--------|
| **Pusher Channels account + app** | Satyam | Create at [pusher.com](https://pusher.com). Channels product (not Beams). |
| **Pusher credentials** | Satyam | `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` on the **backend**; same key + cluster as `VITE_PUSHER_KEY` / `VITE_PUSHER_CLUSTER` on the **frontend build**. |
| **Pusher dashboard: Client events** | Satyam | Enable **client messages** so typing (`client-typing` on `presence-channel-*`) works. |
| **`CRON_SECRET`** | Satyam | Long random string in backend env **and** in Hostinger cron (`X-Cron-Secret` header). |
| **Hostinger cron job** | Satyam | `POST` every 5 min to `https://<domain>/api/internal/cron/poll-email-tickets` (see below). |
| **IMAP mailbox** (if email-to-ticket) | Satyam | `IMAP_HOST`, `IMAP_USER`, `IMAP_PASS`, etc. ÃÂ¢ÃÂÃÂ cron only polls when `IMAP_HOST` is set. |
| **`gh` CLI** | ÃÂ¢ÃÂÃÂ | **OK** on migration machine: logged in as `SatyamChouksey-88`, `repo` scope (PR #2 opened 2026-09-18). |

Until Pusher env vars are set, chat REST works but live updates are no-ops (`getPusherServer()` returns null). Until `CRON_SECRET` + cron are set, use Super Admin `POST /api/email-in/poll` or webhook ingest.

---

## Blocked / Needs From Satyam

Nothing blocks **merging or running the app in dev** except optional live features:

| Blocker | Impact | Workaround in code |
|---------|--------|-------------------|
| No Pusher app / keys | No real-time chat delivery; auth returns **503** if server Pusher env missing | REST + polling; e2e skips full auth when `PUSHER_APP_ID` unset |
| No `CRON_SECRET` / hPanel cron | IMAP poll endpoint returns **503** | Manual `POST /api/email-in/poll` (Super Admin) or `EMAIL_INGEST_SECRET` webhook |
| No IMAP credentials | Cron/manual poll imports **0** messages | Unchanged from pre-migration |
| Stale help copy | Fixed on `main` (2026-09-18) â help uses transport-neutral âreal-timeâ wording |
| CSP on production frontend | If a strict CSP is added, allow Pusher hosts in `connect-src` | See `docs/TECHNICAL_REFERENCE.md` |

---

## Phase 0 ÃÂ¢ÃÂÃÂ Dependency & compatibility check (2026-09-18)

### 0.1 Socket.io / WebSocket usage audit

**Direct `socket.io` / Nest WebSocket packages (after migration)**

| Location | Status |
|----------|--------|
| `backend/package.json` | **Removed** `socket.io`, `@nestjs/platform-socket.io`, `@nestjs/websockets`, `socket.io-client` (dev) |
| `frontend/package.json` | **Removed** `socket.io-client`; **added** `pusher-js` |
| `npm ls socket.io` (backend) | **Empty** ÃÂ¢ÃÂÃÂ not installed |
| `backend/src/chat/chat.gateway.ts` | **Deleted** ÃÂ¢ÃÂÃÂ was the only `@WebSocketGateway` |
| `backend/src/configure-app.ts` | **Removed** `IoAdapter` / `useWebSocketAdapter` |

**Files that used Socket.io for chat (replaced)**

| File | Role |
|------|------|
| `backend/src/chat/chat.gateway.ts` | Connection auth, rooms, typing, presence ping |
| `backend/src/chat/chat.realtime.ts` | Fan-out via Socket.io server |
| `backend/src/chat/chat.presence.ts` | Tied presence to socket connect/disconnect |
| `frontend/src/hooks/useChatSocket.ts` | `socket.io-client` subscriptions |
| `frontend/src/pages/chat/ChatPage.tsx` | Socket handlers |
| `frontend/src/components/StaffChat.tsx` | Unread via socket |
| `backend/test/chat.e2e-spec.ts` | Socket.io delivery test ÃÂ¢ÃÂÃÂ Pusher auth test |

**No hidden Socket.io consumers found** ÃÂ¢ÃÂÃÂ nothing else imported `socket.io` or opened the `/chat` namespace:

| Area | Finding |
|------|---------|
| Notifications / mail | HTTP + Hostinger cron endpoints |
| Ticket ÃÂ¢ÃÂÃÂpresenceÃÂ¢ÃÂÃÂ (`POST /api/support-tickets/:id/presence`) | **Separate** in-memory HTTP heartbeats in `tickets.service.ts` ÃÂ¢ÃÂÃÂ never used Socket.io |
| Dashboards / reports | No WebSocket usage |
| Auth / sessions | JWT + cookies; `req.socket` in `refresh-cookie.ts` is Node HTTP socket, not Socket.io |
| Staff unread badge | `StaffChat.tsx` ÃÂ¢ÃÂÃÂ `useChatSocket` (now Pusher) + REST `/chat/unread` |
| Playwright e2e | No socket.io-client in frontend e2e specs |

**Residual ÃÂ¢ÃÂÃÂWebSocketÃÂ¢ÃÂÃÂ mentions (documentation only)**

- `frontend/src/help/articles.ts` ÃÂ¢ÃÂÃÂ chat help text (pre-Pusher wording)
- `MIGRATION_NOTES.md` / `docs/TECHNICAL_REFERENCE.md` ÃÂ¢ÃÂÃÂ describe Pusher vs old stack

**Other scheduled jobs** ÃÂ¢ÃÂÃÂ moved to HTTP cron in PR #3 (see [Scheduled Jobs Migration](#scheduled-jobs-migration-pr-3)); no in-process `@nestjs/schedule` remains.

### 0.2 Node.js vs Pusher SDKs

| Source | Node requirement |
|--------|------------------|
| `backend/package.json` `engines` | `>=24.16.0` |
| `frontend/package.json` `engines` | `>=24.16.0` |
| `.nvmrc` | **Not present** |
| CI / dev machine checked | **v24.19.0** |
| `pusher@5.3.4` (server) | **No `engines` field** in package.json; uses `node-fetch@2` ÃÂ¢ÃÂÃÂ compatible with Node 24 |
| `pusher-js@8.6.0` (browser bundle) | Runs in browser; build tooling uses same Node 24 |

**Verdict:** No mismatch; do **not** downgrade Node for Pusher.

### 0.3 Env var collision check

| New var | Collision? |
|---------|------------|
| `PUSHER_APP_ID` | **None** in repo |
| `PUSHER_KEY` | **None** (distinct from `JWT_*`, `MS_CLIENT_ID`, etc.) |
| `PUSHER_SECRET` | **None** ÃÂ¢ÃÂÃÂ note `*_SECRET` pattern also used by `JWT_SECRET`, `JWT_REFRESH_SECRET`, `EMAIL_INGEST_SECRET`, `MS_CLIENT_SECRET`, `PLATFORM_ADMIN_SECRET` (commented) |
| `PUSHER_CLUSTER` | **None** |
| `CRON_SECRET` | **None** ÃÂ¢ÃÂÃÂ new name; not the same as `EMAIL_INGEST_SECRET` |
| `VITE_PUSHER_KEY` / `VITE_PUSHER_CLUSTER` | **None** among existing `VITE_*` (`VITE_API_URL`, `VITE_SHOW_DEMO`) |

### 0.4 Frontend build tool (Vite) and public env vars

- **Tool:** Vite 7 (`frontend/package.json`, `import.meta.env`).
- **`VITE_PUSHER_*` are compile-time:** injected at `vite build` / read when the dev server **starts**.
- **Deploy:** Set `VITE_PUSHER_KEY` and `VITE_PUSHER_CLUSTER` in the Hostinger/static build environment, then **run a full frontend rebuild** (`npm run build`). Changing env without rebuild leaves old values in `dist/`.
- **Local dev:** After editing `.env`, **restart** `npm run dev` (Vite does not hot-reload env).
- Backend `PUSHER_*` / `CRON_SECRET`: restart Node process after `.env` change (no frontend rebuild needed).

### 0.5 `gh` CLI (Phase 7)

```
github.com ÃÂ¢ÃÂÃÂ Logged in as SatyamChouksey-88 (keyring)
Token scopes: gist, read:org, repo, workflow
```

PR created: **#2** on `migrate/pusher-realtime-and-cron-worker`.

---

## Why

Hostinger Business Web Hosting managed Node.js apps do not support persistent WebSocket servers or long-running background workers. Chat real-time delivery uses **Pusher Channels**; inbound helpdesk mail polling is triggered by **HTTP cron** instead of `@nestjs/schedule` for IMAP.

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
  -H "X-Cron-Secret: YOUR_CRON_SECRET" \
  "https://<your-domain>/api/internal/cron/poll-email-tickets"
```

Requires `IMAP_*` variables and `CRON_SECRET`. The previous `@Cron` IMAP loop was removed; only this endpoint (or manual `POST /api/email-in/poll` as Super Admin) runs polling.

## Scheduled Jobs Migration (PR #3)

All former `@nestjs/schedule` jobs now share **`InternalCronController`** with `assertCronSecret` + `runCronJob`. **`poll-email-tickets` has a single route** ÃÂ¢ÃÂÃÂ PR #3 replaced PR #2ÃÂ¢ÃÂÃÂs inline logging in the controller with the shared `runCronJob` helper (same `runEmailPollCycle()` behavior).

### Inventory

| Endpoint | Former `@Cron` | Recommended hPanel schedule |
|----------|----------------|----------------------------|
| `poll-email-tickets` | `email-in-poll` (every minute) | Every **5 min** |
| `warranty-alerts` | `warranty-threshold-alerts` | Daily 08:00 |
| `warranty-weekly-digest` | `warranty-weekly-digest` | Mon 08:00 |
| `ticket-daily-digest` | `ticket-daily-digest` | Daily 08:00 |
| `ticket-overdue-mail` | `ticket-overdue-mail` | Hourly |
| `ticket-sla-escalation` | `ticket-sla-escalation` | Hourly |
| `contract-renewals` | `contract-renewal-alerts` | Daily 08:00 |
| `audit-prune` | `prune-auth-audit` | Daily 03:00 |
| `audit-cycle-reminders` | `audit-cycle-reminders` | Daily 08:00 |
| `scheduled-weekly-reports` | `scheduled-weekly-reports` | Mon 08:00 |

Use the same curl pattern as `poll-email-tickets` above, swapping the path segment (e.g. `/api/internal/cron/warranty-alerts`). `@nestjs/schedule` and `ScheduleModule` are **removed**.

### PR #3 rebase onto main (2026-09-18)

`migrate/cron-scheduled-jobs` was **rebased onto `origin/main`** with PR #2 commits replayed, then PR #3 cron commits. There is **one** `POST poll-email-tickets` handler in `InternalCronController` using `assertCronSecret` + `runCronJob` (PR #2Ã¢ÂÂs inline handler removed). Rebase **skipped** commit `b97a033` (PR #2-only internal cron file) as superseded by PR #3Ã¢ÂÂs full controller.

## Autonomous decisions

1. **API prefix on cron URL** ÃÂ¢ÃÂÃÂ Documented as `/api/internal/...` because `configureApp` sets `setGlobalPrefix('api')`.
2. **Private groups** ÃÂ¢ÃÂÃÂ Non-public channels use `private-channel-<id>` (not in the original bullet list but required for private team rooms).
3. **Staff-wide presence** ÃÂ¢ÃÂÃÂ Added `presence-staff` because the UI relied on global `presence` events previously broadcast via Socket.io to all connections.
4. **User notify channel** ÃÂ¢ÃÂÃÂ `private-user-<userId>` carries `unread-changed` (replacing Socket.io `user:<id>` rooms).
5. **Server-side ÃÂ¢ÃÂÃÂonlineÃÂ¢ÃÂÃÂ** ÃÂ¢ÃÂÃÂ Without socket connection tracking, `ChatPresenceService` treats users as connected for ~90s after heartbeat/ping (REST), matching the Pusher client ping interval.
6. **Reactions** ÃÂ¢ÃÂÃÂ `toggleReaction` emits `reaction-added` only (not `message-updated`); the client binds both to the same UI merge path.
7. **E2E realtime** ÃÂ¢ÃÂÃÂ Socket.io delivery test replaced with Pusher auth membership test; full delivery needs Pusher credentials in CI.
8. **Phase 0 recorded after implementation** ÃÂ¢ÃÂÃÂ Audit run on the migrated tree; findings appended here for deploy handoff.

## Local test

1. Create a Pusher Channels app (free tier).
2. Set backend and frontend env vars above; restart API and Vite dev server (or rebuild frontend).
3. Run API + Vite; open `/chat` with two staff browsers; post a message and confirm `new-message` on the channel.

## Merged to main

**Date:** 2026-09-18

| PR | Title | Merge commit |
|----|--------|----------------|
| [#2](https://github.com/SatyamChouksey-88/newvision-it-admin/pull/2) | Pusher chat + email cron endpoint | `9ab99eb926ad170d7a1a0ba5d653f25906fa1b40` |
| [#3](https://github.com/SatyamChouksey-88/newvision-it-admin/pull/3) | Remaining jobs → HTTP cron | `3c699870a424a96abcf545c96398d2e7f0e1c8f5` |

**Merge strategy:** merge commits (same as PR #1). Remote branches deleted after merge.

**Post-merge checks:** `npm run build` passes in `backend/` and `frontend/` on `main`. Single `@Post('poll-email-tickets')` in `backend/src/internal/internal-cron.controller.ts`.

**PR #3 merge note:** GitHub could not merge until `origin/main` (post–PR #2) was merged into the branch. Conflicts in `MIGRATION_NOTES.md`, `backend/.env.example`, `backend/package.json`, `backend/package-lock.json`, `internal-cron.controller.ts`, `internal-cron.module.ts`, `email-inbox.service.ts`, and `docs/TECHNICAL_REFERENCE.md` were resolved by keeping PR #3’s consolidated `InternalCronController` (10 jobs, `assertCronSecret` + `runCronJob`) and dropping `@nestjs/schedule`.
