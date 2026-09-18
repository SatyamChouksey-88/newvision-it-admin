# Migration notes (Hostinger hosting)

## Before you go live — manual dependencies

| Item | Notes |
|------|--------|
| **`CRON_SECRET`** | Long random string; set on the Node app **and** in every hPanel cron `curl` (`X-Cron-Secret`). |
| **hPanel cron jobs** | One HTTP POST per row in [Scheduled Jobs Migration](#scheduled-jobs-migration) below. |
| **IMAP_*** | Required only for `poll-email-tickets`. |

---

## Scheduled Jobs Migration

### Phase 1 inventory (pre-migration `@nestjs/schedule`)

| File | Former cron name | Schedule | Purpose / data touched |
|------|------------------|----------|-------------------------|
| `tickets/email-inbox.service.ts` | `email-in-poll` | Every minute | IMAP fetch unseen mail → `processRaw` → `SupportTicket`, `TicketComment`, `TicketMessage`, `emailIngestState` |
| `notifications/warranty-alert.service.ts` | `warranty-threshold-alerts` | Daily 08:00 | Per tenant: scan `Asset` warranty dates → `Notification`, email via `MailerService` |
| `notifications/warranty-alert.service.ts` | `warranty-weekly-digest` | Mon 08:00 (`0 8 * * 1`) | Per tenant: `Asset` list → email digest |
| `tickets/tickets.digest.ts` | `ticket-daily-digest` | Daily 08:00 | Per tenant: `TicketsService.sendDailyDigests()` + `sendOverdueRequesterMails()` |
| `tickets/tickets.digest.ts` | `ticket-overdue-mail` | Hourly | Per tenant: `TicketsService.mailOverdueTickets()` |
| `tickets/ticket-sla-escalation.service.ts` | `ticket-sla-escalation` | Hourly | Per tenant: overdue `SupportTicket` → `slaEscalatedAt`, `Notification` to IT admins |
| `procurement/contracts.service.ts` | `contract-renewal-alerts` | Daily 08:00 | Per tenant: `VendorContract` end dates → `Notification`, email |
| `audit/audit.service.ts` | `prune-auth-audit` | Daily 03:00 | Global: `auditLog.deleteMany` where `entityType = Auth` and age > 180 days |
| `audit-cycles/audit-cycle-reminder.service.ts` | `audit-cycle-reminders` | Daily 08:00 | Per tenant: stale `AuditCycle` → notifications + email |
| `reports/scheduled-reports.service.ts` | `scheduled-weekly-reports` | Mon 08:00 | Per tenant: `ReportsService.build` (assets/warranty/supplies) → email + in-app notifications |

No `@Interval` or `@Timeout` decorators were found. `ScheduleModule.forRoot()` was removed from `app.module.ts`; `@nestjs/schedule` removed from `package.json`.

### HTTP endpoints (all `POST`, prefix `/api`)

Auth for every endpoint: header `X-Cron-Secret: <CRON_SECRET>` (same as email poll). Responses include structured JSON logs via `runCronJob`.

Base URL placeholder: `https://YOUR_DOMAIN/api/internal/cron`

#### `poll-email-tickets` — every **5 minutes** (was every minute; Hostinger-friendly)

```bash
curl -sS -X POST -H "X-Cron-Secret: YOUR_CRON_SECRET" \
  "https://YOUR_DOMAIN/api/internal/cron/poll-email-tickets"
```

#### `warranty-alerts` — daily **08:00**

```bash
curl -sS -X POST -H "X-Cron-Secret: YOUR_CRON_SECRET" \
  "https://YOUR_DOMAIN/api/internal/cron/warranty-alerts"
```

#### `warranty-weekly-digest` — **Monday 08:00**

```bash
curl -sS -X POST -H "X-Cron-Secret: YOUR_CRON_SECRET" \
  "https://YOUR_DOMAIN/api/internal/cron/warranty-weekly-digest"
```

#### `ticket-daily-digest` — daily **08:00**

```bash
curl -sS -X POST -H "X-Cron-Secret: YOUR_CRON_SECRET" \
  "https://YOUR_DOMAIN/api/internal/cron/ticket-daily-digest"
```

#### `ticket-overdue-mail` — **hourly**

```bash
curl -sS -X POST -H "X-Cron-Secret: YOUR_CRON_SECRET" \
  "https://YOUR_DOMAIN/api/internal/cron/ticket-overdue-mail"
```

#### `ticket-sla-escalation` — **hourly**

```bash
curl -sS -X POST -H "X-Cron-Secret: YOUR_CRON_SECRET" \
  "https://YOUR_DOMAIN/api/internal/cron/ticket-sla-escalation"
```

#### `contract-renewals` — daily **08:00**

```bash
curl -sS -X POST -H "X-Cron-Secret: YOUR_CRON_SECRET" \
  "https://YOUR_DOMAIN/api/internal/cron/contract-renewals"
```

#### `audit-prune` — daily **03:00**

```bash
curl -sS -X POST -H "X-Cron-Secret: YOUR_CRON_SECRET" \
  "https://YOUR_DOMAIN/api/internal/cron/audit-prune"
```

#### `audit-cycle-reminders` — daily **08:00**

```bash
curl -sS -X POST -H "X-Cron-Secret: YOUR_CRON_SECRET" \
  "https://YOUR_DOMAIN/api/internal/cron/audit-cycle-reminders"
```

#### `scheduled-weekly-reports` — **Monday 08:00**

```bash
curl -sS -X POST -H "X-Cron-Secret: YOUR_CRON_SECRET" \
  "https://YOUR_DOMAIN/api/internal/cron/scheduled-weekly-reports"
```

### Autonomous decisions (scheduled jobs)

1. **Email poll frequency** — Documented as every 5 minutes in hPanel (was `@Cron` every minute); endpoint unchanged, only external schedule recommendation.
2. **Shared controller** — All jobs live on `InternalCronController` with shared `assertCronSecret` + `runCronJob` helpers.
3. **Daily ticket job** — `ticket-daily-digest` still runs both `sendDailyDigests` and `sendOverdueRequesterMails` in one call (same as the old single `@Cron` method).
4. **No in-process scheduler in any environment** — Including `NODE_ENV=test`; tests call service methods directly (e.g. `POST /api/warranty/run-check`).
