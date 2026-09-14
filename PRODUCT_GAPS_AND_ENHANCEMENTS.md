# PRODUCT_GAPS_AND_ENHANCEMENTS.md

Status as of **Prompt 32 (2026-09-14)**. The original investigation lived here and in `NEWVISION_RESEARCH_PACK.md`. This file is now the **fix ledger**, not a second stale status doc.

Authoritative runbook: **`PROGRESS.md`** (what shipped) + **`DECISIONS.md`** (why). `PROJECT_STATUS.md` points here for the Prompt 32 close-out.

## Part 1 — Security & production hardening — **fixed**

| Item | Status |
|------|--------|
| Demo credentials on login / demo password in production | Login demo box is `import.meta.env.DEV` only. Production demo logins blocked unless `ALLOW_DEMO_LOGINS=true`. **Rotate live JWT/refresh secrets and the Super Admin password on Render** if that env still has seeded `Password123!`. |
| `GET /dashboard/setup` for every role | Restricted to Super Admin / IT Admin. |
| `GET /locations` for Employee | Directory list is staff+manager, not Employee. |
| Vendor list/detail + unmasked bank | Vendors ADMIN-only. Bank masked unless Super Admin / IT Admin on detail. `/vendors/options` is names-only for IT Support (repairs). |
| Other over-broad reads | Search omits locations for Employee; asset finance redacted for non-admins. |
| Login rate-limit | On `POST /auth/login`. |
| Helmet + CSP | `configureApp`; Swagger off in production unless `SWAGGER_ENABLED=true`. |
| JWT in localStorage | Access token in **sessionStorage**; refresh is **httpOnly** `nv_refresh` cookie. Residual XSS risk on the access token is documented in `DECISIONS.md`. |
| Password minimum | 12 characters on set/reset/create. |
| Refresh revoke on password change | Both refresh slots cleared; access JWT dies after `passwordChangedAt`. |
| Email-ingest secret compare | Timing-safe. |
| Swagger public in production | Disabled unless explicitly enabled. |
| docker-compose JWT 8h / SEED_ON_START wipe | `JWT_EXPIRES_IN=30m`; `SEED_IF_EMPTY`. |
| Ticket upload vs chat | Shared `assertAllowedUpload` (blocks html/svg/jar; no octet-stream free pass). |

## Part 2 — Half-built loops — **fixed in code**

| Item | Status |
|------|--------|
| Real outbound email | Mailer already sends via **Resend** when `RESEND_API_KEY` is set, else SMTP, else console. Live inbox proof depends on production env. |
| Inbound email + attachments | IMAP/webhook ingest extracts MIME attachments into `TicketAttachment` (same allow-list). HTML sanitized before keep. |
| Overdue ticket email | Hourly cron mails the requester once (`overdueMailedAt`). |
| Manager team inventory/people | Nav: Team devices + Team. Home KPI links to `/assets`. API already team-scoped. |
| Super Admin raise a ticket | Lazy-provisions an Employee linked to the staff user; seed also links Sara Admin. |
| Maintenance vendor | `vendorId` FK + `/vendors/options` picker. Seed exercises repaired/reassigned as well as open. Stale 14+ days chip. |
| Request fulfillment asset | `fulfilledAssetId` (or kit). UI records the issued asset. IT Support can fulfill. |
| Scan-to-audit | Authenticated `POST /assets/audit-by-code`. Public card stays PII-safe. Unaudited filter already on Assets + dashboard. |
| Seed brand/model + chat pings | Manufacturer paired with real model lines. Test pings soft-deleted immediately. |

## Part 3 — A11y, reports, audit export — **fixed**

| Item | Status |
|------|--------|
| Skip-to-content on authenticated chrome | Yes (`#main-content`). |
| axe-core as Employee/Manager/Support + login/scan/procurement/settings | `frontend/e2e/a11y.spec.ts`. `aria-hidden-focus` **re-enabled**; Ant Design dropdown/modal portals excluded (upstream). |
| Manager report cards “estate-wide” | Copy is “your team”. Location report grouped from team-scoped assets/people. |
| Full audit-log export | `GET /audit-logs/export` + **Download all CSV** on the Audit Log page. |
| Weekly warranty email | Monday 08:00 digest to IT (optional; reuses mailer). Daily 90/60/30 alerts already existed. |

## Part 4 — Docs — **fixed**

| Item | Status |
|------|--------|
| Help “no bulk assign” | Corrected — bulk assign exists. |
| Playwright counts in README/PROGRESS | Reconciled below to the `test(` count in `frontend/e2e/` (**101** cases as of this prompt, not a pass claim). |
| Login “directory account” | Copy does not claim SSO. |
| Stale PROJECT_STATUS | Header now points at PROGRESS + this ledger. |

## Deliberately deferred (not bugs)

Out of scope per Prompt 32 Part 5: dark mode, phone-width admin app, SSO/SAML, workflow/SLA engine, CMDB, live AD/HR sync, AI triage, Redis/queues, PunchOut/OCR/GL, multi-mailbox/Slack ingest, ticket merge/split, custom-fields builder. See `FUTURE_IDEAS.md`.

**Live production verification** (demo login blocked, Resend + IMAP e2e, Swagger 404, secret rotation) still needs a Render deploy after this lands — do not treat a local green suite as production-proven.
