# PROGRESS.md

Running log of what's done, phase by phase, plus known issues.

## Phase 0 — Scaffold ✅

- [x] Verified toolchain: Node 24, npm 11, Docker 29, git 2.55.
- [x] Chose versions (see DECISIONS.md).
- [x] Backend NestJS (v11) project scaffolded, builds & runs.
- [x] Prisma 7 schema + initial migration applied (Postgres via docker).
- [x] Frontend Refine + AntD scaffolded.
- [x] docker-compose (postgres + backend + frontend).
- [x] GitHub Actions CI (lint, type-check, unit, integration, Playwright).

## Phase 1 — Core foundation ✅ COMPLETE

Backend (all endpoints implemented, RBAC enforced at API layer, audit on every mutation):
- [x] JWT auth + 5-role RBAC (global JwtAuthGuard + RolesGuard)
- [x] CRUD: Locations, Departments, Employees, Categories, Assets
- [x] Assign / Transfer / Retire + generic status change with lifecycle enforcement + audit log
- [x] Global search (`/api/search`) across asset code, serial, employee, model, location
- [x] Dashboard metrics + per-location filter + warranty-expiring panel
- [x] CSV/Excel import & export for assets and employees
- [x] Audit log viewer endpoint (Super Admin, IT Admin only)
- [x] Seed script: 1180 employees, 1250 assets across Pune/Hyderabad/Bhopal, 5 demo users
- [x] Tests: **28 unit + 19 integration (e2e) = 47 passing**; Biome lint clean; tsc clean

Frontend (Refine + AntD, all Phase 1 screens):
- [x] Login (demo accounts), sidebar nav, header global search, logout
- [x] Dashboard: metric cards + per-location filter + warranty-expiring table
- [x] Assets: list (filters, compact/comfortable density, sticky header), create/edit/show, assign/transfer/retire modals, CSV import/export
- [x] Employees: list + profile (assigned assets), Locations CRUD, Audit log viewer
- [x] UI/UX: status = color+icon+text, muted subtext identifiers, tabular figures, ₹ currency, plain "N days" warranty, flat design
- [x] Biome lint clean; `tsc --noEmit` clean; `vite build` clean

Infra:
- [x] Dockerfiles (backend multi-stage; frontend dev server) + `docker-compose.yml` (postgres + backend + frontend), entrypoint runs migrate + optional seed. **Verified end-to-end**: stack builds, boots, migrates, seeds, and serves seeded data.
- [x] GitHub Actions CI: backend (lint/typecheck/unit/integration), frontend (lint/typecheck/build), Playwright e2e job.
- [x] Playwright e2e: **8 passing** — login, create/assign/transfer asset, CSV import, global search, employee-role RBAC.

Definition of Done: all Phase 1 features implemented; unit + integration + e2e tests green; no lint/type errors; seed data present; README documents run/test steps. ✅

## Phase 2 — Operational depth ✅ COMPLETE

Backend:
- [x] Maintenance / repair module: report issue → `reported` → `under_repair` → `repaired` → `reassigned` (plus `cancelled`), with vendor, estimated/actual cost, expected-completion & completed dates. Ticket transitions are coupled to the asset lifecycle (asset moves to `under_repair`, then back to `assigned`/`available`), all inside one transaction and fully audited.
- [x] Employees can report an issue only on an asset assigned to them (API-enforced); IT roles manage the repair queue.
- [x] Warranty expiry alerts: daily `@nestjs/schedule` cron (`WarrantyAlertService`) fires the day an asset hits a 90/60/30-day threshold, creating de-duplicated `warranty_expiry` notifications and emailing IT (SMTP when configured, console otherwise). Manual trigger: `POST /api/warranty/run-check`.
- [x] Notifications API: `GET /api/notifications` (own + broadcast), `PATCH /api/notifications/:id/read`.
- [x] Reports module: asset / employee / location / warranty reports, each downloadable as **CSV** (ExcelJS) or **PDF** (PDFKit landscape table). `report:run` roles only.
- [x] Employee profile endpoint confirmed single-query (no N+1) with assigned assets.
- [x] Tests: **34 unit + 29 integration (e2e) = 63 passing**; Biome lint clean; tsc clean.

Frontend:
- [x] Maintenance page: repair queue table (status = colour+icon+text, ₹ costs, reported/expected dates), Report-Issue modal (asset picker, issue, vendor, estimated cost, expected date), and per-status transition actions (Start Repair / Mark Repaired + actual cost / Reassign / Cancel). Non-IT roles see a report-only view.
- [x] Reports page: all four reports with CSV + PDF download buttons.
- [x] Employee profile already lists assigned assets with status + warranty.
- [x] Biome lint clean; `tsc --noEmit` clean; `vite build` clean.

- [x] Playwright e2e: **11 passing** (8 Phase 1 + report-a-repair flow + 2 report downloads).

Definition of Done: all Phase 2 features implemented; unit + integration + e2e green; no lint/type errors; seed data present (seed includes maintenance records); README updated. ✅

## Phase 3 — Scale & governance ✅ COMPLETE

Backend:
- [x] Background import jobs (`ImportJob`): upload → suggested column mapping → dry-run preview (duplicate detection in-file and in-system) → in-process commit (`setImmediate`) → error report → rollback of created IDs. Sync Phase 1 `/import/*` still works.
- [x] Saved filter views (`SavedView`): per-user + shared, scoped by resource. Owner or IT Admin can update/delete.
- [x] Bulk asset actions: `POST /api/assets/bulk` (`status` | `transfer` | `retire`), per-id partial success, reuses lifecycle validators + audit.
- [x] Reconciliation (`ReconciliationRun`): upload HR/inventory CSV, set-diff on `employeeCode`/`email` or `assetCode`/`serialNumber`. Manual upload only.
- [x] Tests: **40 unit + 37 integration = 77 passing**; Biome lint clean; tsc clean.

Frontend:
- [x] Assets: saved-view picker + Save view, row selection, bulk status/transfer/retire modals.
- [x] Settings tabs: Account · Import jobs (mapping / dry-run / commit / rollback) · Reconciliation (findings tables). Sidebar nav unchanged.
- [x] Seed: two shared views (`Available in Pune`, `Under repair`).
- [x] Biome lint clean; `tsc --noEmit` clean; `vite build` clean.
- [x] Playwright e2e: **14 passing** (11 prior + save view + import dry-run + HR reconcile).

Definition of Done: all Phase 3 features implemented; unit + integration + e2e green; no lint/type errors; seed data present; README updated. ✅

## Phase 4 — QR codes & webhooks ✅ COMPLETE

- [x] QR PNG per asset (`qrcode`): authenticated `GET /api/assets/:id/qr` and public `GET /api/public/assets/:code/qr`. Encodes `{PUBLIC_APP_URL}/scan/{assetCode}`.
- [x] Public mobile scan page `/scan/:code` (no login) via `GET /api/public/assets/:code` — status, item, serial, location, assignee, warranty; no cost/history.
- [x] Webhook subscriptions (`WebhookEndpoint`): CRUD for Super Admin / IT Admin. Events `asset.created` and `asset.status_changed`. HMAC-SHA256 `X-NewVision-Signature`. Delivery awaited with a 2.5s timeout; failures recorded on the endpoint, never thrown to the caller.
- [x] Emitted from asset create / status update / assign / transfer / retire / changeStatus, and from maintenance-driven asset status changes.
- [x] Settings → Webhooks tab; asset show page embeds QR + download + link to scan page.
- [x] Tests: **46 unit + 41 integration = 87 passing**; Playwright **15** (prior 14 + public scan page). Lint/tsc/build clean.

Definition of Done: Phase 4 features implemented; tests green; README updated. ✅ All planned phases (1–4) complete.

## Prompt 2 — Review, requests, accessories & UX ✅ COMPLETE

- [x] Code review fixes: manager direct-report profile scope; scoped export rejects empty filters.
- [x] Asset/accessory requests: employee → manager → IT fulfill (single-step, no workflow engine).
- [x] Accessories & consumables modules end-to-end (API, UI, audit, reports, assign shortcut).
- [x] Dashboard attention panel; notification bell; copy + toast; status legend.
- [x] Pagination + expand rows + empty/skeleton states on assets, employees, audit, maintenance, locations, accessories, consumables, requests.
- [x] Import jobs: expandable run details (started/completed/duration/created/updated/failed); field-level failure reasons.
- [x] Keyboard shortcuts: `/` global search, `Esc` close modals/expand, ↑↓ row focus on assets/employees.
- [x] axe-core Playwright checks on dashboard, assets list, asset detail.
- [x] Official NewVision branding in `frontend/public/brand/`.
- [x] Tests: **46 unit + 46 integration = 92** backend; **19 Playwright** (16 prior + requests flow + 3 axe-core a11y checks).

Definition of Done: Prompt 2 features implemented; tests green; README/PROGRESS/DECISIONS updated. ✅

## Prompt 4 — Dashboard & import visualizations ✅ COMPLETE

- [x] `GET /api/dashboard/trends` — monthly asset additions (zero-filled, location-filterable).
- [x] Dashboard charts: status donut, assets-by-location bar, 12-month trend line, sparkline on Total KPI.
- [x] Dedicated chart color palette in `frontend/src/chartColors.ts` (separate from UI chrome).
- [x] Import result charts: outcome donut + failure-category bar on active job and expanded run history.
- [x] `@ant-design/plots` for all visualizations; UI chrome unchanged.
- [x] Tests: **46 unit + 47 integration = 93** backend; **19 Playwright** still green.

Definition of Done: Prompt 4 features implemented; tests green; PROJECT_STATUS/PROGRESS/DECISIONS updated. ✅

## Prompt 6 — Audit, DataGrid, Help, ship ✅ COMPLETE

- [x] Full audit pass; structured `ImportErrorCode`; README test counts corrected.
- [x] Prompt 3 completed: text hierarchy, two-tier shadows, accent-only interactive color.
- [x] Shared `DataGrid` (sort, filter, resize, reorder, show/hide, sticky, density, Ctrl+C, CSV export) on **assets, employees, audit, accessories**; component ready for remaining list screens (consumables, requests, maintenance, locations, import jobs).
- [x] Copy-to-clipboard extended across grids and audit entity IDs.
- [x] Full `/help` documentation section with search, nav, Getting Started, Keyboard Shortcuts articles.
- [x] Seed accessories + consumables demo catalog.
- [x] Tests: **49 unit + 47 integration = 96** backend; **22 Playwright** (added help.spec.ts).
- [x] Pushed to GitHub: https://github.com/SatyamChouksey-88/newvision-it-admin

Definition of Done: Prompt 6 core features implemented; tests green; docs updated; pushed. ✅

## Prompt 8 — Self-audit & enhancements ✅ COMPLETE

- [x] Full codebase audit → `ENHANCEMENTS.md` (every item resolved).
- [x] Employee offboarding API + UI (asset return/reassign, accessory check-in, deactivate user, preserve history).
- [x] Employee History tab — merged timeline from assignments, transfers, accessories, consumables, requests, audit.
- [x] RBAC: employee list scoped by role; `GET /employees/:id` visibility enforced; delete blocked when history exists.
- [x] DataGrid on **all** list screens (consumables, requests, maintenance, locations, import jobs added).
- [x] Dashboard KPI cards link to filtered assets list; CopyButton on asset detail + maintenance + grids.
- [x] Help screenshots captured and committed (`frontend/public/docs/screenshots/`).
- [x] Prisma indexes on `Employee.isActive`, `Employee.managerId`.
- [x] Tests: **49 unit + 50 integration = 99** backend; **24 Playwright** (history + dashboard drill-down).
- [x] Docs updated; pushed to GitHub.

Definition of Done: Prompt 8 audit complete; Section 3 re-verification confirmed in code; all tests green; pushed. ✅

## Prompt 9 — Visual alignment (approved Claude Design mockup) ✅ COMPLETE

- [x] Copied approved mockup → `design-reference/NewVision_Asset_Manager.html`
- [x] Extracted design tokens → `design-reference/DESIGN_TOKENS.md` (supersedes Prompt 3/6 theme where conflicting)
- [x] Rewrote `frontend/src/theme.ts` — canvas `#F8FAFC`, accent/links `#0958D9` (WCAG AA), KPI muted surface `#F1F4F8`, status bar colors
- [x] New `KpiCard` component — 4px top accent bar, uppercase label, icon, value (signature mockup treatment)
- [x] Dashboard, header, login, global CSS (`index.css`) — sidebar chrome, table typography, attention panel, responsive header
- [x] Status badges, chart colors, warranty cells aligned to extracted palette
- [x] A11y contrast fixes — link blue `#0958D9`, KPI/table secondary text `#334155`/`#475569`
- [x] Help screenshots re-captured (`frontend/public/docs/screenshots/`, 14 images)
- [x] Tests: **49 unit + 50 integration = 99** backend; **24 Playwright** (incl. axe-core) green
- [x] Docs updated; pushed to GitHub

Definition of Done: UI matches approved mockup look-and-feel; no functional regressions; Help screenshots current; all tests green; pushed. ✅

## Functionality audit — history, tables, search, guards ✅ COMPLETE

- [x] Asset detail no longer silently drops assignment/transfer/maintenance history after 10 rows
- [x] Employee History includes maintenance tickets; per-source caps raised from 50–100 to 500; 200-event hard slice removed
- [x] DataGrid shows a full-text tooltip whenever a cell overflows; wrap-text still available
- [x] Asset detail + dashboard warranty tables use DataGrid (sort/filter/export/resize)
- [x] Global search ticket hits now land on `/maintenance` with a real `q` filter (ticket id searchable)
- [x] Inactive employees blocked from assign/transfer/checkout/issue; reinstate + list status filter
- [x] Tests: **50 unit + 66 integration** backend; **31 Playwright**
- [x] Merged to `main` via PR #1 (`97a461c`); remote branch deleted

## Dashboard lists, inline status, editable requests (2026-09-10)

- [x] Inline status dropdown on Assets, Maintenance, and Requests (allowed transitions only)
- [x] Requests stay editable after fulfill; expand-row shows who changed what
- [x] Tests updated
- [x] Prompt 12 restored dashboard charts (status donut, stacked location bar, growth) per the approved mockup — lists are no longer the primary viz

## Prompt 12 — Merge audit branch + final design system (2026-09-10)

- [x] Fast-forward / merge PR #1 into `main`; remote `audit/functionality-and-truncation` deleted
- [x] Fresh audit: DataGrid on webhooks, reconciliation, and import mapping/errors; raised silent `take` caps on profile/history/reports
- [x] Design tokens from `design-reference/NewVision-standalone-src.html` applied (`theme.ts`, `index.css`, `DESIGN_TOKENS.md`)
- [x] Login two-column + estate panel; 216px sider + MANAGE + Sign out; 52px header with breadcrumb + ⌘K
- [x] Dashboard KPI 3px bars, Needs attention + Dismiss all, charts restored, warranty DataGrid
- [x] Accessories card grid (table toggle), maintenance status chips with counts, reports card grid, Help article chrome
- [x] Employee profile tabs: Assigned assets / Accessories & consumables / History / Requests
- [x] Keep me signed in uses sessionStorage when unchecked; warranty urgency ≤14 red / ≤45 amber
- [x] Docs updated to drop “pending / on a branch” language

## Prompt 13 — Investigation-based enhancements ✅ COMPLETE

- [x] `PROJECT_STATUS.md` rewritten against shipped Phases 1–4 and Prompts 2/4/6/8/9/12 + PR #1 merge (no longer frozen at Prompt 4)
- [x] Tablet-width admin: auto-collapsed sider, reflowing KPIs, horizontal table scroll, stacked Help/login; documented phone-width as non-goal
- [x] Light-only: `data-color-mode="light"` + `color-scheme: light` + Ant Design default algorithm; OS dark preference cannot invert chrome
- [x] First-run Welcome card when `GET /dashboard/setup` reports `freshInstall` (all-zero locations/employees/assets); seeded demo unchanged
- [x] Settings → Categories tab; Employees → Add employee modal (first-run steps need real screens)
- [x] Public scan page restyled to Prompt 12 tokens; still single-column / no login
- [x] Playwright coverage for welcome (mocked empty estate vs seeded), tablet sider/drawer, light-only under `prefers-color-scheme: dark`, phone-width scan overflow
- [x] Docs: PROJECT_STATUS, PROJECT_DOCUMENTATION, PROGRESS, DECISIONS
- [x] Tests: **52 unit + 67 integration = 119** backend; **40 Playwright** (incl. axe-core). Lint/tsc clean.

## Prompts 14–16 — Helpdesk ticketing, CSAT/digest, notes & manual edit ✅

- [x] A1 Growth (12 months) chart: UTC month keys + frontend binding; seed `createdAt` from purchase date
- [x] A2 Select-all checkbox headers (assets + tickets); never render the aria-label as visible text
- [x] A3 MANAGE single muted color; logos from `frontend/public/brand/` on sider, login, Help, favicon
- [x] Support tickets: lifecycle, comments (public/internal), watchers, time logs, canned responses, templates, attachments, optional asset link, overdue flag, reports, RBAC, Help
- [x] CSAT on resolve, IT email digest vs immediate, quick/saved views, full-text search, contact cards, duplicate-of, bulk assign/close, category default priority, CSV/PDF export
- [x] Append-only notes on major records; Manual correction (Super Admin + IT Admin) with mandatory reason + confirm; backfill tag; audit filter `manual_override`
- [x] Deliberately excluded: SLA engine, routing rules, KB suggestions, email-in, AI triage, leaderboards, custom fields, merge/split, bulk manual edit, rewriting audit/notes
- [x] Tests: **57 unit + 79 integration = 136** backend; **47 Playwright** (incl. axe-core). Lint/tsc clean.

## Prompt 17 — Verified enhancement pass ✅ COMPLETE

- [x] Route-level `React.lazy` + `Suspense` (including inner Outlet fallback); Vite `manualChunks` for charts / Ant Design / Refine / React
- [x] Growth chart is a cumulative climbing estate total (`added` + `total`/`count`); HTML legend labels both series
- [x] Docs test counts re-verified: **58 unit + 84 integration = 142** backend; **55 Playwright**
- [x] Four reported bugs confirmed in the running UI (growth scale, select-all checkbox, MANAGE color, logos/favicon)
- [x] Helpdesk/notes polish (empty/loading, axe on tickets + notes); command-palette search covered by Playwright
- [x] Lint/tsc/production build clean; full suites green

## Prompt 18 — Real helpdesk emails ✅ COMPLETE (visual direction superseded by Prompt 19)

- [x] Real, branded HTML email templates (`backend/src/notifications/ticket-email-templates.ts`) for:
      ticket created (confirmation to requester), ticket assigned, new unassigned ticket (staff),
      new comment, status change, resolution rating prompt, daily digest. `MailerService.send`
      now accepts an optional `html` body; falls back to plain text / console log when SMTP isn't
      configured (unchanged graceful-degradation behavior).
- [x] Wired into every `TicketsService` lifecycle call site that previously only sent plain text.
      Requester now gets a creation confirmation email, which did not exist before.
- [x] `backend/test/ticket-emails.e2e-spec.ts` (5 tests) spies on `MailerService.send` and
      asserts the right subject/template fires for create/assign/comment/status-change/resolve/digest.
- [x] `.env.example` comment updated to describe SMTP as covering the full ticket lifecycle, and
      that `PUBLIC_APP_URL` now also feeds the email logo/CTA links.
- Prompt 18 also started a "futuristic light theme" pass (glow, glass/backdrop-blur, gradient
  mesh, a bento dashboard grid). Prompt 19 explicitly superseded that visual direction in favor
  of matching `design-reference/NewVision-standalone-src.html` literally — see Prompt 19 below
  for what was kept vs reverted.

## Prompt 19 — Verified re-match against the reference mockup ✅ COMPLETE

- [x] Re-read `design-reference/NewVision-standalone-src.html` directly (not from memory/summary)
      and confirmed the existing Prompt 12 token system already matches it — the gap was Prompt 18's
      futuristic overlay fighting those tokens, not the tokens themselves.
- [x] Reverted the futuristic overlay: gradient-mesh backgrounds (login estate panel, first-run
      welcome card), glass/backdrop-blur on modals/dropdowns/notification panel, glow box-shadows
      on buttons and the active nav item, the live-pulse dot (notification bell + dashboard), and
      the bento-grid dashboard layout — restored to the reference's plain equal-size KPI/chart
      grids (`repeat(auto-fit, minmax(...))`, opaque white cards, `0 2px 6px rgba(16,24,40,0.06)`
      hover shadow only).
- [x] **Kept as a genuine, tasteful improvement** (Prompt 17's original call, reaffirmed here):
      the `⌘K` command palette as the one global search/jump entry point — restyled to the
      reference's own plain notification-panel look (opaque white, `#E4E9F0` border, `0 6px 20px
      rgba(16,24,40,0.10)` shadow, no blur) instead of the glass treatment Prompt 18 gave it.
- [x] **Kept**: the dashboard subtitle now says "Updated N minutes ago" — the reference mockup's
      own copy (`{{ crumb }}... Updated 6 minutes ago`), just implemented as live relative text
      instead of the mockup's static string, with no pulsing dot.
- [x] Found and fixed a real WCAG AA failure while re-testing: AntD's `color="green"` preset
      (`#389e0d` on `#f6ffed`, 3.37:1) on the asset-notes "Active" tag and in the command palette's
      result tags — replaced with the project's established safe pairs (e.g. `#15803D`/`#F0FDF4`
      for green), matching `StatusTag`'s existing convention.
- [x] `design-reference/DESIGN_TOKENS.md` annotated where the implementation deliberately deviates
      from the mockup's literal pixels for accessibility (`textPlaceholder` `#64748B` not `#94A3B8`).
- [x] Deliberately did **not** add the mockup's floating black "?" help-launcher FAB (bottom-right) —
      the header's labelled "Help" button is the same entry point with better discoverability and
      a11y (a visible label beats an icon-only floating button); logged here rather than silently
      diverging.
- [x] Re-verified full suites after the revert: **58 unit + 84 integration = 142** backend tests,
      **55 Playwright** (incl. axe-core) — all green; lint/tsc/production build clean on both sides.

## Prompt 20 — Visual rebuild, role shells, ticket depth, email-in ✅

- [x] Custom 216px sidebar (`AppSider`), thin scrollbars, quiet ⧉ copy chip, chip filters on Assets/Employees
- [x] Growth chart removed from the UI; Status and Location are coloured tables (status tag + share; per-office status columns)
- [x] Five role homes (IT console / Support queue / Manager team / Employee My IT) with scoped dashboard APIs
- [x] Settings → Users / Departments, employee create-login, JWT refresh, forgot/change password (prior + wired)
- [x] Ticket human timeline, `waiting_on_employee` (pauses SLA clock; requester reply resumes), first-response labels
- [x] Email-in: threadable outbound mail, IMAP poller + ingest webhook, loop/OOO/dedupe, unmatched senders flagged
- [x] Duplicate asset + 20-up QR label PDF; category delete blocked when assets remain
- [x] Help rewritten for the new dashboard/homes/tickets; Playwright no longer asserts a Growth chart

## Help documentation site (MkDocs-style, in-app) ✅

- [x] Full-page Help shell: skip-to-content, fixed header (logo → home, search, Back to app), collapsible multi-level left nav, auto ToC from article headings, footer credit
- [x] Landing “At a glance” cards for every major area + “How the app is organized”
- [x] Instant client-side search (titles, headings, body) — no server round-trip
- [x] Admonition components (Note / Tip / Warning) + fenced code blocks
- [x] Articles rewritten for real behaviour (scan PII, warranty dump, chat, settings tabs, tips)
- [x] Screenshot script waits for any signed-in home (not “Dashboard”); captures locations + chat
- [x] Playwright: nav expand/collapse, ToC, search, every article H1, skip-link, Home link; axe-core on `/help` and `/help/getting-started`

## Prompt 22 — Admin efficiency (one item at a time)

- [x] **#1 Ticket timeline “Not started”** — if status is already `assigned` / `in_progress` / `waiting_on_employee` (or resolved/closed/reopened), the timeline shows a backfilled “Work started” from `updatedAt` instead of “Not started”. Verified with e2e (prisma status update, no start audit) + unit helper. Open/unassigned tickets still show Not started.
- [x] **#2 Ticket list columns** — Requester (`Name · EMP-code`), Assignee, and Age/SLA badge (same colours as the ticket header). SLA tags moved out of the Ticket column so the grid is scannable. Playwright asserts the three headers.
- [x] **#3 Assign to me** — row action on the ticket list and a header button on ticket detail. Assigns the current IT Admin/IT Support user and moves `open`/unassigned tickets to `in_progress`. Employees get 403. Verified in tickets e2e for both staff roles.
- [x] **#4 Warranty split** — `/dashboard/warranty-expiring` defaults to upcoming only (`bucket=expiring`, 30 days); `bucket=expired` is the lapsed list. Assets Warranty chip: 14/30/90 days vs Already expired. Dashboard attention has an **Expiring (14d)** deep-link. Warranty report is upcoming dates only.
- [x] **#5 Stale-repair attention link** — Needs attention now opens `/maintenance` with `staleDays=14` (open repairs reported 14+ days ago), not the unfiltered queue.
- [x] **#6 My work list** — `/dashboard/attention` returns ordered `myWork`: my overdue tickets → unassigned → waiting on employee 3+ days → stale repairs → incomplete checklists → contracts ending in 14 days → warranties expiring in 14 days. IT Admin keeps KPI tiles; IT Support’s home is this list. Unassigned rows have Assign to me.
- [x] **#7 Contracts + checklists on screen** — seed one contractor ending in 8 days (`EMP-00002`) and one incomplete onboard checklist (`EMP-00001`). Employees **Follow-up** filter (14-day contracts / incomplete checklist), list tags, and a profile warning. Dashboard My work already lists both.
- [x] **#8 Canned macros** — canned replies can optionally **wait on the employee** or **resolve** when sent as a public reply. Internal notes do not change status. Settings → Helpdesk has the After send field. Open tickets may move straight to waiting/resolved so a first reply can close the loop.

## UI polish (2026-09-11)

- [x] Employees list: **Active** only in the Status column (name cell is name + EMP code)
- [x] Support Tickets DataGrid toolbar: CSV/PDF aligned with Compact / Columns / Export CSV
- [x] Paste screenshot (Snipping Tool / Ctrl+V) on raise-ticket and ticket attachments
- [x] Command palette / header search colour UI (behaviour unchanged)

## Prompt 23 v2 — Vendor & Procurement ✅

- [x] Prisma models + migration `20260911140000_prompt23_procurement`
- [x] Vendor lifecycle, bank re-approval, blacklist enforcement, scorecards
- [x] Requisition template form, parallel To/Cc icons, material vs trivial edit, withdraw, reject→resubmit
- [x] PO convert / amend / cancel / short-close, GRN partial + void, 3-way match
- [x] Contracts + renewal cron + renew/clone; asset coverage; handoff + reconcile flags
- [x] Help articles, Reports cards, My work entries for pending approvals and overdue payments
- [x] Enhancements beyond the brief: invoice overdue auto-flag on list, command-palette jumps, pending-vendor from free-text name, PO PDF marked amended, 2% match tolerance via env

## Known issues

- **Seed resets demo data on container start** when `SEED_ON_START=true` (the compose default). Convenient for demos, but restarting the backend wipes manual changes. Set `SEED_ON_START: "false"` in `docker-compose.yml` after the first boot to persist changes. Documented in README.
- Playwright's `create asset` test asserts on the rendered `brand model` subtext (the list intentionally shows a secondary identifier instead of the serial column), so re-runs accumulate demo assets with the same model — harmless, and reset by reseeding.
