# NewVision Asset Manager — Completion checklist (verified 2026-09-17 / 2026-09-18)

Canonical detail: [`PHASE_LOG.md`](../PHASE_LOG.md) · [`TECHNICAL_REFERENCE.md`](TECHNICAL_REFERENCE.md#newvision-asset-manager-completion-checklist-verified-2026-09-17)

Legend: `[x]` verified · `[~]` partial / descoped · `[ ]` open · `[!]` Satyam / production only

## Environment (this host)

| Item | Value |
|------|--------|
| Node | **v24.19.0** (system `PATH`, libuv **1.52.1**) |
| OS | Windows **26200** |
| Postgres | Docker `newvision` + `newvision_test` |
| Entra | **Not wired** — no `MS_*` / `ENTRA_*` in `backend/.env`; mock IdP only |

## Automated verification (live numbers)

| Suite | Command | Result | When |
|-------|---------|--------|------|
| Unit | `cd backend && npm test` | **153/153**, ~20 s | 2026-09-17 |
| Backend e2e | `NODE_OPTIONS=--max-old-space-size=4096 npm run test:e2e` (API **off** `:3000`) | **206/206**, **37/37** suites, exit **0**, ~502 s | 2026-09-17 evening |
| Playwright | `cd frontend && npm run test:e2e` (API **on** `:3000`, seeded DB) | **102/102**, exit **0**, ~8.8 min | 2026-09-18 |

## Phase 1–5

- [x] Hardening, Entra + JIT (mock IdP), MFA transition flag, tenancy fail-closed.
- [x] E2E isolation — `seedCore(prisma, app)` + RBAC refresh; `maxWorkers: 1`.
- [x] Permission-based API auth — `RolesGuard` + `route-permissions.generated.ts`; custom roles via `effectivePermissions()`.
- [x] Custom roles CRUD, permission UI, assignment, audit.
- [x] `INITIAL_SUPER_ADMIN_EMAILS` bootstrap + unit tests.

## Phase 6

- [x] In-app + email ticket notification matrices (e2e).
- [x] Email-in ingest + reply (e2e).

## Phase 7

- [x] Large-import decision; streaming parse; batched commit.
- [x] Benchmark **100k rows / 178 ms** parse (`scripts/benchmark-import.mjs`).
- [~] Duplicate scan still materializes mapped rows once per job (10 MB cap).

## Phase 8

- [x] Signup removed; trial provision; doc archive.
- [x] **Keep** `tickets.service.ts` / `ChatPage.tsx` unsplit for v1 (`DECISIONS.md`).
- [x] README / DECISIONS updated.

## Phase 9–10

- [x] Unit + backend e2e + Playwright baselines (table above).
- [x] Manual walkthrough notes — `docs/MANUAL_WALKTHROUGH.md` / `TECHNICAL_REFERENCE.md#manual-walkthrough-local-sign-off`.
- [x] Graceful shutdown, request log, import rate limit, load-test script, Sentry wiring (DSN optional).

## Phase 11–14

- [x] Offboard checklist, SLA escalation, ticket→chat, warranty crons.
- [~] KB / license compliance engine descoped (Help + tickets).
- [x] Audit cycles + scan linkage; CSV export.
- [~] Scheduled audit-cycle reminder emails not built.
- [x] Pilot / feedback / depreciation / clients / VDI / reports.

## What's left before real go-live `[!]`

- [!] **Microsoft Entra** — app registration, secrets, redirect URIs, Conditional Access; set env per technical reference.
- [!] **Helpdesk mailbox** — real IMAP/SMTP or Graph for `email-in`; outbound SPF/DKIM/DMARC.
- [!] **Hostinger VPS** — target production host (Render/`render.yaml` docs are legacy until VPS runbook exists).
- [!] **TLS / CDN / CSP** — production SPA + API.
- [!] **Optional:** `SENTRY_DSN`; durable import queue; audit-cycle reminder emails; API **≥2 h** soak on Node 24.19+ (deferred).

## Ops reminders

- Regenerate route map after controller edits: `node backend/scripts/gen-route-permissions.mjs`.
- Do **not** run full Jest e2e while dev API listens on **:3000**.

No git push or deploy in this verification pass.
