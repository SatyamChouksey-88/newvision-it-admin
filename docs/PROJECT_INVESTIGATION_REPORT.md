# NewVision — Project Investigation Report

**Date:** 2026-09-17 (investigation session)  
**Scope:** Read-only audit of working tree (large uncommitted diff vs `origin/main`; commit `917003e` is not representative of local feature state).  
**Method:** Index docs (`PHASE_LOG.md`, `docs/TECHNICAL_REFERENCE.md` only — `docs/COMPLETION_CHECKLIST.md` and `docs/PROJECT_HISTORY.md` **not present**), code/tests/git verification, one-shot test runs (no fixes, no retries).

---

## Test runs (this session — real numbers)

| Suite | Command | Environment | Result |
|-------|---------|-------------|--------|
| Backend unit | `cd backend && npm test` | Node **v24.19.0**, no DB | **153/153** passed, 41 suites, ~13s, exit 0 |
| Backend e2e | `NODE_OPTIONS=--max-old-space-size=4096 npm run test:e2e` | Postgres `newvision_test`, 32 migrations applied | **154/206** passed, **52** failed, **37** suites (**25** pass / **12** fail), ~608s, exit **1** — failures dominated by `seedCore()` (`roles_name_key` unique violations, deadlocks on `assetCategory.create`); many `pg` “client already executing a query” deprecations during run |
| Import parse benchmark | `node backend/scripts/benchmark-import.mjs` | No DB | **100,000** rows, **~4.96 MB**, parse **125 ms** (this run) |
| Health load test | `node backend/scripts/load-test-health.mjs` | API expected `:3000` | **Failed** — `ECONNREFUSED` (API not reachable at end of session) |
| Playwright | `cd frontend && npx playwright test` | API was up early (health 200); degraded later | **Incomplete** — **41/102** tests logged **passed** (through `chat.spec.ts`); from test **42** onward mostly **~31s timeouts**; run still **in progress / stalled** on worker after ~17+ min at test ~70; **not** 102/102 — **do not treat PHASE_LOG / TECHNICAL_REFERENCE Playwright numbers as verified today** |

**Node / Windows crash (STATUS_STACK_BUFFER_OVERRUN, -1073740791):** Not observed on this e2e run (exit 1 with Jest summary). `backend/package.json` and `frontend/package.json` pin `engines.node` **`>=24.16.0`**. Shell `node -v` → **v24.19.0**. **2+ hour API soak not run.**

---

## Section A — Core ITAM

- [x] Asset CRUD — `backend/src/assets/assets.controller.ts`, `assets.service.ts`; e2e `backend/test/assets.e2e-spec.ts` (spec exists; **failed this run** on seed)
- [x] Assignment / transfer / return / status lifecycle — `backend/src/assets/lifecycle.ts`, `assets.service.ts`; e2e in `assets.e2e-spec.ts`, Playwright `frontend/e2e/assets.spec.ts` (**passed** this session)
- [x] Employees — `backend/src/employees/`; e2e `employees-offboard.e2e-spec.ts`, Playwright `prompt22-employees.spec.ts`
- [x] Locations — `backend/src/locations/`; CRUD + e2e coverage via feature specs
- [x] Accessories (separate module) — `backend/src/accessories/`, `frontend/src/pages/accessories/list.tsx`
- [x] Consumables (separate module) — `backend/src/consumables/`, `frontend/src/pages/consumables/list.tsx`
- [x] Maintenance / repair — `backend/src/maintenance/` (distinct from helpdesk); Playwright `maintenance.spec.ts` (**failed** this session — timeout)
- [x] Asset requests — `backend/src/asset-requests/`; Playwright `requests.spec.ts`
- [x] Reports — `backend/src/reports/`; Playwright `reports.spec.ts` (not reached in partial Playwright run)
- [x] Audit log — `backend/src/audit/`; Playwright `audit-fixes.spec.ts` (**passed**)
- [x] Search / filter / pagination / bulk — `backend/src/search/search.controller.ts`, list query helpers; tickets bulk in `tickets.controller.ts`; Playwright list/governance specs
- [~] Excel import + export incl. large files — `import-export/`, `import-jobs/` with `forEachTabularRow` / `parseCsvStreaming` (`parse.ts`); **benchmark parse only** (125 ms / 100k rows); commit path batched (`import-jobs.service.ts`); upload cap / duplicate scan materialization still bounded (~10 MB) per TECHNICAL_REFERENCE
- [x] QR scan + reconciliation — `assets.stampAudit` / `stampAuditByCode`; `reconciliation.service.ts`; e2e `prompt35-scan-audit.e2e-spec.ts`; Playwright `scan.spec.ts`, `prompt35-scan-audit.spec.ts`
- [x] Annual audit cycle flow — `backend/src/audit-cycles/`, `recordPhysicalScan()` wired from `assets.service.ts`; Settings UI `frontend/src/pages/settings/audit-cycles.tsx`; e2e `phases-11-14.e2e-spec.ts` (file present; suite **passed** in 25/37 passing e2e files this run — individual file not isolated)

---

## Section B — Helpdesk ticketing

- [x] Employee self-service tickets (distinct from asset/maintenance) — `support-tickets` routes in `tickets.controller.ts` vs `maintenance.controller.ts`
- [x] Email-in pipeline — `email-inbox.service.ts`, `email-inbox.controller.ts`; e2e `email-in.e2e-spec.ts`, unit `email-inbox.spec.ts` (unverified sender → `comment_unverified`)
- [x] SLA / escalation — `ticket-sla-escalation.service.ts` (hourly cron, notifications)
- [x] Notifications — `ticket-notifications.e2e-spec.ts`, `ticket-emails.e2e-spec.ts`
- [x] Ticket history / reopen — timeline endpoints; email reopen case in `ticket-emails.e2e-spec.ts`

---

## Section C — Vendor & procurement

- [x] Vendor onboarding — `procurement/vendors.service.ts`, `vendors.controller.ts`; e2e `prompt36-a2-vendors.e2e-spec.ts`
- [~] Requisition form vs internal approval-email template — UI fields + `ApprovalChain` with To/Cc + green/amber/red icons (`frontend/src/pages/procurement/status.tsx`, `requisitions/show.tsx`); help copy claims parity (`help/articles.ts`) — **not visually compared to a real Outlook template in this audit**
- [x] Requisition → PO → GRN (partial) → invoice 3-way match + tolerance — `purchase-orders.service.ts`, `PROCUREMENT_MATCH_TOLERANCE_PCT`; e2e `prompt23-procurement.e2e-spec.ts`, `prompt36-a1-invoices.e2e-spec.ts`
- [x] Contracts / SLA renewal alerts — `contracts.controller.ts`, cron services referenced in TECHNICAL_REFERENCE
- [x] Vendor scorecards — `VendorsController.scorecard`, `vendors.service.ts`
- [x] Received PO → auto asset/accessory/consumable/contract — `purchase-orders.service.ts` `runHandoff()` (serialized → `asset`, accessory/consumable/license branches)

---

## Section D — Teams-style chat

- [x] Channels, DMs, threads, reactions — `chat.service.ts` (thread queries, reaction grouping)
- [x] Presence — `chat.presence.ts`, `presenceMap` / `presenceMode` on users
- [x] Real-time WebSocket — `chat.gateway.ts`, Socket.IO in `app.module` / frontend `socket.io-client`
- [~] Color / look-and-feel consistency — procurement tags and `ROLE_CHIP` in `access.ts` show intentional palette; **no Claude Design mockup in repo to diff**; Playwright `prompt14-bugs` (sidebar MANAGE color) **failed** this session

---

## Section E — UI/UX consistency (5 roles)

- [~] Five roles visually distinct — `navForRole`, `ROLE_CHIP`, role-specific labels in `access.ts` / `AppSider.tsx`; login demo matrix in `login.tsx` — **automated “matches mockup” not possible**
- [~] Sidebar / scrollbar / copy-button polish — CSS in `index.css`, list chrome e2e `list-chrome.spec.ts` (**failed** this session)
- [~] Dashboard growth chart, select-all header, sidebar label bugs — `dashboard.controller.ts` growth endpoint; Playwright `prompt14-bugs.spec.ts` (**failed** at 23 ms on growth API — likely auth/API down); fixes claimed in PHASE_LOG **not re-verified** in full Playwright run

---

## Section F — Repo hygiene

- [~] No Cursor/Claude/ChatGPT/prompt-authoring traces — **many `promptNN` e2e/spec filenames** and comments (e.g. `entra-auth.e2e-spec.ts` references `prompt32`); not literal “ChatGPT” strings in app code
- [~] Docs consolidation into `docs/TECHNICAL_REFERENCE.md` — **only** `docs/TECHNICAL_REFERENCE.md` + `docs/handoff/api-routes-index.md` under `docs/`; PHASE_LOG cites `docs/archive/` — **directory not present** in workspace
- [~] `DECISIONS.md` / `PRODUCT_GAPS_AND_ENHANCEMENTS.md` — **linked from TECHNICAL_REFERENCE but files missing**

---

## Section G — Enterprise hardening (Phases 1–9)

### P1 hardening
- [x] Demo-login opt-in — `demo-logins.ts` (`ALLOW_DEMO_LOGINS`), `demo-logins.spec.ts`
- [x] MFA default path — TOTP in `auth.service.ts` / `auth.controller.ts` (`mfaRequired` when enabled)
- [x] Tenant fail-closed — `tenancy/prisma-extension.ts`, `prisma-extension.spec.ts`
- [x] Last Super Admin guard — `users.controller.ts` message enforced
- [x] Email-sender verify on replies — `email-inbox.service.ts` + tests
- [x] Upload allowlist — `common/uploads.ts`, `uploads.spec.ts`
- [x] Dead routes removed — `signup.tsx` / `trust.tsx` deleted; no `/signup` in `App.tsx`
- [x] MFA rate-limit — covered in `prompt32-security.e2e-spec.ts` (suite **failed** this run on seed)

### P2 Entra ID auth
- [x] Mock IdP + real-login readiness — `auth/entra/*`, `auth/mock-idp/*` (disabled in production via `mockIdpEnabled()`)
- [?] Full e2e clean on Windows — `entra-auth.e2e-spec.ts` present; **not isolated-pass verified this session**; no libuv crash this run, but full suite **red**

### P3 JIT provisioning
- [x] — `entra.service.ts` `resolveUserForSignIn`, migration `phase3_entra_department`, tests in `entra-auth.e2e-spec.ts`

### P4 MFA via Entra transition
- [x] Flag + docs — `ENTRA_SATISFIES_MFA` in `entra-config.ts`, `auth.service.ts` skip local TOTP when set

### P5 RBAC / custom roles
- [x] Current state (post-revert migration chain) — migrations `phase5_custom_roles` → revert → `phase5_custom_roles_table`; `custom-roles` module
- [x] Custom roles enforce API — `RolesGuard` + `route-permissions.generated.ts` + `userHasPermissions` for `customRoleId` users (`roles.guard.ts`); evidence `custom-role-rbac.e2e-spec.ts` (not re-run alone this session)
- [x] System roles still use `@Roles()` when no `customRoleId` — same guard hybrid logic

### P6 Ticketing / email hardening + notification audit
- [x] — targeted e2e files `ticket-notifications`, `ticket-emails`, `email-in` (full suite not green today)

### P7 Scalability (100k import)
- [x] Parse benchmark **verified this session** (125 ms); end-to-end import of 100k rows through HTTP **not run** (10 MB cap / in-process jobs)

### P8 Code cleanup
- [~] Signup removed, scripts added; **large file splits deferred** (`tickets.service.ts`, `ChatPage.tsx` per PHASE_LOG)

### P9 Full suite green
- [!] **Not green this session** — unit 153/153; e2e 154/206; Playwright incomplete/failing — contradicts PHASE_LOG / checklist “206/206” and “102/102”

---

## Section H — Go-live & remaining (Phases 10–14)

### P10
- [x] Logging / Sentry hook — `instrument.ts`, `@sentry/nestjs` (needs `SENTRY_DSN`)
- [~] DB pool tuning — documented in TECHNICAL_REFERENCE; not validated under load (load test failed)
- [x] Backup/restore runbook — TECHNICAL_REFERENCE `#backup-and-restore-drill` (Render-oriented)
- [x] Rate limits beyond auth — `import-rate-limit.service.ts`, login rate limit
- [x] Rollback runbook — `#render-deploy-rollback-phase-10` (Render dashboard steps)
- [!] Local load-test numbers — script exists; **this run: ECONNREFUSED**
- [x] CORS/CSP doc — `#cors-and-csp-phase-10`, `configure-app.ts` Helmet

### P11
- [x] Offboarding automation — `employees.service.ts` checklist + accessory check-in
- [x] Warranty/contract reminder crons — existing scheduled services (per module grep / TECHNICAL_REFERENCE)
- [~] License compliance engine — **descoped** (help + procurement only)
- [~] KB — **descoped** to in-app Help (`frontend/src/help/`)
- [x] SLA escalation — `ticket-sla-escalation.service.ts`
- [x] Chat notifications on tickets — `ticket-chat-notify.service.ts`
- [ ] Scheduled reports — **no** `scheduledReport` / report cron found in `backend/src`

### P12 Formal annual audit cycle
- [x] Entity + API + UI + CSV export — `audit-cycles/`, `settings/audit-cycles.tsx`
- [x] Per-scan capture on open cycle — `recordPhysicalScan()` from audit stamp
- [~] Exception taxonomy / evidence / sign-off — schema + `close()` with sign-off user; depth not fully audited test-by-test
- [ ] Scheduled cycle reminder emails — **not built** (acknowledged in TECHNICAL_REFERENCE)

### P13
- [x] `INITIAL_SUPER_ADMIN_EMAILS` — `entra-config.ts`, `entra-config.spec.ts`
- [x] Email-ticket lifecycle e2e — `ticket-emails.e2e-spec.ts` (suite not green in full run)
- [~] Data-migration dry-run — import `validateOnly` on commit (`import-jobs`); **no separate legacy DB migration CLI**
- [x] Depreciation logic — `common/depreciation.ts`, `depreciation.spec.ts`, exposed on assets GET
- [x] Pilot rollout plan — section `#newvision-it-admin-pilot-rollout-plan` in TECHNICAL_REFERENCE (no standalone `docs/PILOT_ROLLOUT_PLAN.md`)
- [x] First-login help — `FirstRunWelcome.tsx`
- [x] Feedback button — `FeedbackButton.tsx`, `feedback.controller.ts`

### P14
- [x] Client/project assignment + history — `clients/` module, schema migration `phases_11_14`
- [x] VDI environment records — clients API
- [x] VDI ticket category — seed/provision + ticket fields (per `phases-11-14.e2e-spec.ts`)
- [x] Client escalation tracking — client/ticket linkage in schema/services
- [x] Tickets-by-client report — `reports.service.ts` type `tickets-by-client`, frontend `reports.tsx`, `/clients` UI

---

## Section I — Known infra issues

- [~] Node ≥ 24.16.0 pinned — **yes** in both `package.json` files; machine **v24.19.0** during audit
- [?] Windows Jest crash (-1073740791) — **not seen** this e2e run; **stability not proven** (e2e failed for DB seed reasons; no 2× repeat, no 2 h soak)
- [~] Render → Hostinger VPS — `render.yaml` still present and TECHNICAL_REFERENCE still describes **Render** as deploy target; untracked `docs/NewVision_GoLive_Hostinger_Guide.docx` suggests intent shift — **VPS runbook not in tracked markdown**; applying `render.yaml` still valid for Render, not for Hostinger without new IaC

---

## Summary table (rough counts)

| Section | Done | Partial | Missing | Broken | Can't verify locally |
|---------|------|---------|---------|--------|----------------------|
| A Core ITAM | 12 | 1 | 0 | 0 | 0 |
| B Helpdesk | 5 | 0 | 0 | 0 | 0 |
| C Procurement | 5 | 1 | 0 | 0 | 0 |
| D Chat | 3 | 1 | 0 | 0 | 0 |
| E UI/UX | 0 | 3 | 0 | 0 | 0 |
| F Hygiene | 0 | 3 | 0 | 0 | 0 |
| G Phases 1–9 | 15 | 2 | 0 | 1 | 1 |
| H Phases 10–14 | 14 | 5 | 2 | 1 | 0 |
| I Infra | 0 | 2 | 0 | 0 | 1 |

---

## Additional findings (Section J)

1. **Massive uncommitted local work** — `git status` shows most Phases 2–14 code, migrations, tests, and docs as **untracked or modified**; `main` is only **ahead 1** of `origin/main`. Production readiness of **remote** `origin/main` is **not** the same as this workspace.
2. **Local branch `audit/functionality-fixes`** exists; not merged to `main` (remote also has `audit/functionality-and-truncation`).
3. **Prisma model count ~75** (`schema.prisma`) vs TECHNICAL_REFERENCE “58 models” — doc stale.
4. **CI uses Node 22** (`.github/workflows/ci.yml`) while packages require **≥24.16.0** — CI/docs/runtime mismatch.
5. **E2E seed fragility** — concurrent `pg` client use warnings + `roles_name_key` / deadlock errors in `helpers.ts` `seedCore()` during full run; may explain gap between PHASE_LOG “206/206” and today’s **154/206**.
6. **Playwright + API coupling** — early tests passed with API healthy; later failures coincided with **API unreachable** (`load-test-health.mjs` ECONNREFUSED); long Playwright run may have starved or stopped API on `:3000`.
7. **Mock Entra IdP** — full OIDC loop for local dev (`mock-idp.module.ts`); safe production gate documented in module comment.
8. **Route permission generator** — `backend/scripts/gen-route-permissions.mjs` + `route-permissions.generated.ts` (~251 routes per PHASE_LOG); must be regenerated when controllers change.
9. **Platform / multi-tenant ops** — `tenant.controller.ts`, `PLATFORM_ADMIN_SECRET`, trial provisioning in `tenancy/provision.ts` (signup route removed; trials via test helper / platform).
10. **Issue kits / join kit** — `assets/issue-kits.controller.ts`, Playwright `prompt38-join-kit.spec.ts` (failures this session).
11. **Handoff developer docs** — untracked `docs/handoff/*.pdf`, diagrams, `api-routes-index.md` (283 routes claimed in TECHNICAL_REFERENCE).
12. **Entra state handoff** — OAuth callback uses one-time `handoff` code (`entra-state-store.ts`) — good security pattern; not production Entra tested.
13. **Super Admin MFA prod gate** — TECHNICAL_REFERENCE K5 still notes commented prod enforcement in `auth.service.ts` (grep shows TOTP flow active; prod **mandate** unclear).
14. **`backend/e2e-final-run.log`** — untracked log in git status (possible prior run artifact; not parsed in this audit).

---

## Top gaps (priority order)

1. **Backend e2e suite not green** on investigation run (154/206) — fix `seedCore` / DB isolation before trusting PHASE_LOG sign-off.
2. **Playwright not green** — complete run with stable API; investigate API death during UI suite.
3. **Uncommitted phase work** — commit/migrate/review before any deploy; `origin/main` lacks Entra, custom roles, audit cycles, clients, etc.
4. **Production Entra + mailbox** — mock IdP only locally.
5. **Deploy target ambiguity** — Render blueprint vs Hostinger VPS guide (untracked).
6. **CI Node version** vs `engines` (22 vs 24).
7. **Scheduled audit-cycle reminders + scheduled reports** — missing.
8. **Dedicated data-migration dry-run tool** — only import `validateOnly`.
9. **End-to-end 100k row import** through API — not demonstrated (parse-only benchmark).
10. **Windows Node crash / long soak** — not re-validated (no -1073740791 today, but no positive soak proof).

---

## Blocked on Satyam

| Item | Why |
|------|-----|
| Microsoft Entra app registration, `MS_*` secrets, redirect URIs, Conditional Access | Real tenant; local mock only |
| Helpdesk mailbox (IMAP/SMTP or Graph), SPF/DKIM/DMARC | Inbound/outbound ticket mail |
| `INITIAL_SUPER_ADMIN_EMAILS` production values | Bootstrap Super Admins on first real login |
| `SENTRY_DSN` (optional) | Error tracking in prod |
| Depreciation policy sign-off (salvage %, useful life defaults) | Logic exists; business rules |
| Render **vs** Hostinger VPS decision + env/TLS/CORS/`PUBLIC_APP_URL` | `render.yaml` still Render-centric |
| Node install on Windows (if any machine still on 24.15.0) | Admin MSI / PATH per PHASE_LOG |
| Re-run **clean** e2e (2–3×) + full Playwright after DB/API stability | Prove 206/206 and 102/102 |
| Commit/push local phase work | Remote does not match workspace |

---

## Stale doc claims (verified against repo / this run)

| Claim | Source | Evidence it's stale or wrong |
|-------|--------|------------------------------|
| Backend e2e **206/206** always green | PHASE_LOG, TECHNICAL_REFERENCE checklist | This run: **154/206**, exit 1 |
| Playwright **102/102** | PHASE_LOG, TECHNICAL_REFERENCE | This run: **41 passed**, then mass failures; run incomplete |
| `docs/COMPLETION_CHECKLIST.md` / `PROJECT_HISTORY.md` | User investigation list | **Files absent**; content merged into TECHNICAL_REFERENCE only |
| `docs/archive/` root doc archive | PHASE_LOG Phase 8 | **Directory missing** |
| `DECISIONS.md`, `PRODUCT_GAPS_AND_ENHANCEMENTS.md` | TECHNICAL_REFERENCE | **Files missing** |
| **58** Prisma models | TECHNICAL_REFERENCE | **~75** `model` lines in `schema.prisma` |
| Runtime **Node 22** | TECHNICAL_REFERENCE stack table | `engines` **≥24.16.0**; CI still **22** |
| Phase 7 “NOT DONE” (no benchmark) | PHASE_LOG mid-file | Later PHASE_LOG + code contradict; benchmark script **exists** and ran (**125 ms**) |
| Known issue K1 `/signup` not in App | TECHNICAL_REFERENCE K1 | `signup.tsx` **deleted**; route removed — K1 outdated |
| Pilot plan “e2e **196/196**” | TECHNICAL_REFERENCE pilot section | Suite now **206** tests (37 files) |
| Unit **119** in setup Phase 11 | TECHNICAL_REFERENCE | Current **`npm test` → 153** |
| “Substantively complete / only Satyam items left” | PHASE_LOG final polish | Undermined by **today's failing e2e** and **uncommitted** work on `main` |
| Custom roles “UI only” / `@Roles()` only | PHASE_LOG earlier “Needs review” | **Resolved in code** — `RolesGuard` hybrid; older log lines stale |

---

## Investigation metadata

- **Postgres:** `docker compose` container `newvision-postgres-1` healthy during audit.
- **Secrets:** No credentials recorded in this report.
- **Actions taken:** Read-only code/doc/git inspection; test commands above; **only file written:** `docs/PROJECT_INVESTIGATION_REPORT.md`.
