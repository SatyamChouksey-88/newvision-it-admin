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
- [x] Branch `audit/functionality-and-truncation` + PR

## Known issues

- **Seed resets demo data on container start** when `SEED_ON_START=true` (the compose default). Convenient for demos, but restarting the backend wipes manual changes. Set `SEED_ON_START: "false"` in `docker-compose.yml` after the first boot to persist changes. Documented in README.
- Playwright's `create asset` test asserts on the rendered `brand model` subtext (the list intentionally shows a secondary identifier instead of the serial column), so re-runs accumulate demo assets with the same model — harmless, and reset by reseeding.
