# DECISIONS.md

Every judgment call made while building NewVision, and why. Newest at the bottom of each phase.

## Phase 0 — Setup & stack

- **Monorepo layout**: `backend/` (NestJS) + `frontend/` (Refine + AntD) + root Docker/CI. No npm-workspaces tool — two independent `package.json`s keeps tooling simpler and avoids hoisting issues between Nest and Vite.
- **Prisma pinned to 7.10.0 (stable)** for both `prisma` CLI and `@prisma/client`. The npm `latest` dist-tag for the `prisma` CLI currently points at `8.0.0-rc.13` (a release candidate), while `@prisma/client` stable `latest` is `7.10.0`. Using the RC would risk CLI/client drift, so pinned both to the matching stable 7.10.0.
- **NestJS 12** (`@nestjs/*@12`), the current major.
- **Ant Design 6** + **Refine 5/6** — current majors as of 2026-09. Bleeding edge; watched closely during frontend build.
- **Prisma generator**: default `prisma-client-js` for maximum ecosystem compatibility (avoids the new ESM-only `prisma-client` generator output quirks).
- **Auth**: JWT access token only for Phase 1 (no refresh-token rotation yet). Simplest workable option; refresh tokens noted as a future hardening item. Passwords hashed with `bcrypt`.
- **Roles** modeled as a Prisma enum `RoleName` (SUPER_ADMIN, IT_ADMIN, IT_SUPPORT, MANAGER, EMPLOYEE) plus a `roles` table row per role, so permissions can be enforced in a `RolesGuard` at the API layer.
- **Database for tests**: unit tests mock `PrismaService`; integration/e2e tests run against a real Postgres (docker-compose service in CI). Keeps unit tests fast and hermetic.
- **Import/export libraries**: `exceljs` for `.xlsx`, `papaparse` for CSV parsing, `csv` output built with `exceljs`/manual; `pdfkit` for PDF reports.
- **TypeScript 7**: `@nestjs/schematics@12` requires `typescript >= 6`; current stable TS is 7.0.2, so pinned `typescript@^7`. Installed with `--legacy-peer-deps` because several bleeding-edge deps (ts-jest, ts-node) still advertise narrower TS peer ranges — they work fine at runtime with TS 7 for our usage.
- **Runtime/test toolchain = tsx + @swc/jest (not ts-node/ts-jest)**: TypeScript 7 removed `baseUrl` and changed internal APIs, which breaks `ts-node@10` (crashes reading `ts.sys.fileExists`). Switched TS execution to **tsx** (esbuild-based, TS-version-agnostic) for `start`, `start:dev`, and the Prisma seed; switched Jest's transform to **@swc/jest** with a `.swcrc` enabling legacy decorators + `decoratorMetadata` (required for NestJS DI). `build` uses plain `tsc -p tsconfig.build.json` rather than `nest build`, so we don't depend on `@nestjs/cli` at build time.
- **Prisma 7 driver adapter**: Prisma 7 removed `url` from the `datasource` block. Now the connection string lives in `prisma.config.ts` (used by the CLI for migrations) and `PrismaClient` **requires** a driver adapter. Chose `@prisma/adapter-pg` + `pg` (node-postgres) — the standard self-hosted Postgres path. Kept the default `prisma-client-js` (CommonJS) generator so it plays nicely with NestJS's CommonJS build.
- **NestJS pinned to v11 (CommonJS), not v12**: NestJS 12 ships as pure ESM (`"type": "module"`). That runs fine under Node 24's `require(ESM)`, but Jest's runtime cannot `require` those ESM packages, which broke every unit/e2e test that imports Nest. NestJS **11.2.3** is CommonJS and works seamlessly with `@swc/jest`. The framework requirement ("NestJS") is unversioned, so v11 is a compliant, far lower-risk choice. All `@nestjs/*` satellites pinned to their v11-compatible majors (config 4, jwt 11, passport 11, schedule 5, swagger 11).
- **Linter = Biome (not ESLint/typescript-eslint)**: `typescript-eslint` explicitly refuses to run under TypeScript 7 (throws "does not support TS 7.0"). Switched to **Biome 2.5** which parses TS/decorators natively without depending on the `typescript` package. Enabled `unsafeParameterDecoratorsEnabled` for NestJS parameter decorators. Biome also handles formatting, replacing Prettier.
- **Test DB isolation**: e2e tests run against a dedicated `newvision_test` database. A Jest `globalSetup` creates it (via `pg`) and runs `prisma migrate deploy`; each suite reseeds a small deterministic fixture. Keeps e2e runs hermetic and repeatable without touching dev/seed data.
- **Asset deletion guard**: hard-delete is only permitted on `retired`/`disposed` assets (Super Admin only); everything else must be retired first. Prevents orphaning assignment/transfer/maintenance history and keeps the audit trail meaningful.

## Phase 1 — Frontend, Docker & CI

- **Frontend stack pinned to compatible majors**: `@refinedev/antd` requires **AntD 5** (not 6), so the stack is Refine 5 + AntD 5 + React 19 + React Router 7 + Vite 7 + `@vitejs/plugin-react@4` (v6 of the plugin isn't compatible with Vite 7's export map). The earlier `DECISIONS` note about "Ant Design 6 + Refine 5/6" was superseded during the build — AntD 5 is what actually works.
- **Refine API specifics for v5**: use `ThemedLayout` (not `ThemedLayoutV2`), and `useCustom` returns data under `.query.data` (not a top-level `data`). Adjusted dashboard/profile accordingly.
- **Custom Refine data provider**: the backend returns `{ data, total }` for lists and sets `x-total-count`; wrote a thin custom data provider + Axios client (with a JWT request interceptor) rather than using a generic REST provider, so pagination/sort/filter map cleanly onto the Nest query params (`_start/_end/_sort/_order/q`).
- **Playwright drives the real UI, not tokens**: e2e tests log in through the form and exercise AntD components (Selects via portal dropdowns, Upload via the hidden `input[type=file]`). The suite assumes a **seeded backend on :3000**; Playwright's `webServer` boots the Vite dev server (reused locally, fresh in CI). Fixtures live in `frontend/e2e/fixtures/`.
- **Backend Docker image = multi-stage, but ships `src` + dev deps**: final stage copies `dist` **and** `src` (+ `node_modules` incl. dev deps) because the seed (`tsx prisma/seed.ts`) imports shared logic from `src` (e.g. RBAC permissions) and Prisma CLI/`tsx` are needed at container start for `migrate deploy` + `seed`. OpenSSL is installed for Prisma's engine. Heavier than a pure prod image, but this compose stack targets **local development**, where being able to migrate/seed/run in-container is the point.
- **Build-time `DATABASE_URL` placeholder**: `prisma.config.ts` strictly resolves `env('DATABASE_URL')` when loaded, and `prisma generate` loads it. Since `generate` never connects, the build stage sets a throwaway `DATABASE_URL`; the real value is injected at runtime by compose/CI.
- **Entrypoint normalizes line endings**: `docker-entrypoint.sh` is `sed`-stripped of CR in the image (Windows checkouts produce CRLF, which breaks `#!/bin/sh`). A root `.gitattributes` also forces `*.sh` to LF. Belt and suspenders so the stack builds identically on Windows/macOS/Linux.
- **`.npmrc` with `legacy-peer-deps=true`** committed in both projects so `npm ci` (Docker + CI) resolves the same bleeding-edge peer-dependency graph that local installs used, without needing a manual flag.
- **CI uses a Postgres service container + `POSTGRES_DB: newvision`** so `prisma migrate deploy` has a database to target; the integration job additionally lets `globalSetup` create `newvision_test`. The Playwright job builds+seeds+boots the backend (`nohup` so it survives across steps), waits on `/api/docs`, then runs the browser tests and uploads the HTML report artifact.

## Phase 2 — Maintenance, warranty alerts & reports

- **Jest globals imported explicitly (`@jest/globals`)**: under TypeScript 7 the ambient `@types/jest@30` globals (`describe/it/expect/beforeAll/…`) were not being picked up during `tsc --noEmit`, failing `npm run typecheck` on every spec. Rather than fight `types`/`typeRoots` resolution, each spec now imports the globals from `@jest/globals` (the officially recommended, ESM-friendly form for Jest 30). `@swc/jest` handles the import at runtime with zero behaviour change.
- **Maintenance lifecycle enforced with its own transition table** (`maintenance-status.ts`), mirroring the asset lifecycle module: `reported → under_repair → repaired → reassigned`, with `cancelled` reachable from `reported`/`under_repair`. Ticket transitions drive the coupled **asset** status change inside the *same* Prisma transaction and write both a `AssetMaintenance` and an `Asset` audit entry, so the asset never diverges from its open ticket.
- **`available → under_repair` added to the asset lifecycle**: a spare in storage can need repair before it is ever assigned. The Phase 1 lifecycle only reached `under_repair` from `assigned`; this was widened (the lifecycle unit tests never asserted it was forbidden, and it makes the maintenance flow work for unassigned assets).
- **Warranty alerts = daily cron, fired on exact threshold days**: `WarrantyAlertService` runs at 08:00 daily (`@nestjs/schedule`) and alerts the day an asset's remaining warranty equals 90/60/30 days (`matchingThreshold`, UTC date-only math). Notifications are **de-duplicated per asset+threshold** (a `[30-day]` marker in the title) so re-runs are idempotent; a manual `POST /api/warranty/run-check` endpoint exposes the same logic for admins and tests.
- **Email is SMTP-when-configured, console otherwise**: added `nodemailer`; `MailerService` builds a real SMTP transport when `SMTP_HOST` is set, else logs the message. Console fallback is the documented local-dev default (`.env.example`), so warranty alerts are observable without a mail server. Recipients = active Super Admin + IT Admin users.
- **Reports = one service, two renderers**: `ReportsService.build()` produces a typed `{ title, columns, rows }` per report (assets/employees/locations/warranty), then a CSV renderer (ExcelJS `csv.writeBuffer`) or a PDF renderer (PDFKit, A4 landscape, auto-paginating table). Location/warranty aggregates use Prisma `groupBy` and `_count` to stay N+1-free.
- **Notifications** table (already in the schema) is used for both warranty alerts and issue-reported events; `GET /api/notifications` returns the current user's own rows plus broadcast (`userId = null`) rows.

## Phase 3 — Import jobs, saved views, bulk actions, reconciliation

- **In-process import queue, not Redis/Bull**: a fourth compose service (Redis) is out of scope for local-dev. `ImportJobsService.commit` marks the job `running` and processes via `setImmediate`. The file is stored as `bytea` on `import_jobs` so preview/commit/rollback work after the request returns. Tests call `process()` directly to avoid racing the event loop.
- **Column mapping is a suggested `{sourceHeader → canonicalField}` map**: `suggestMapping` matches normalized headers plus aliases (`Serial No` → `serialNumber`). Unrecognised columns map to `''` (ignored). Duplicate detection is a pure function on one identity key (`serialNumber` for assets, `email` for employees) against both the file and the current DB.
- **Rollback deletes only IDs recorded on that job**: assignment/transfer/maintenance/notification rows for those assets are cleared first so FKs do not block the delete. The Phase 1 synchronous `/import/assets` endpoint is unchanged for small files.
- **Bulk actions are best-effort / per-row**: one illegal transition must not abort the rest. Each id reuses `retire` / `changeStatus` / `transfer` (already transactional + audited).
- **Import jobs + reconciliation live under Settings tabs**, not new sidebar items — the brief locks the nav to Dashboard / Assets / Employees / Locations / Maintenance / Reports / Settings.
- **Reconciliation is a case-insensitive set-diff**, no fuzzy name matching and no live AD/HR sync. Findings are capped at 500 rows per side in the stored JSON; the counts themselves are exact.

## Phase 4 — QR codes & webhooks

- **QR encodes the frontend scan URL, not the API**: `PUBLIC_APP_URL` (default `http://localhost:5173`) + `/scan/{assetCode}` so a phone camera opens the UI. PNG generated with `qrcode` (error correction M, 320px). Public QR/scan endpoints are unauthenticated on purpose — physical possession of the sticker is the access control; the card omits cost, invoice, and history.
- **Webhook delivery is awaited in-request** (2.5s `AbortSignal.timeout` per subscriber) instead of another `setImmediate` queue. With zero subscribers this is a no-op; with a dead URL the API still returns, and `lastError` is stored. HMAC-SHA256 over the raw JSON body; secret shown once on create, redacted on later reads.
- **Events are only the two named in the brief** (`asset.created`, `asset.status_changed`). Assign/retire/maintenance fire `asset.status_changed` when the asset status actually changes. The existing Nest/Swagger surface is the “REST API”; no second public API was added.

## Prompt 2 — Requests, accessories & UX

- **Asset requests are a single-step approval, not a workflow engine**: `pending → approved|rejected → fulfilled`. Manager sees only direct reports; IT Admin fulfills manually (no auto-assign). Rejection requires a human-readable `rejectionReason`.
- **Accessories vs consumables are separate tables**, not serialized assets. Accessories track `quantity_total` / `quantity_checked_out`; consumables track `quantity_available` with a per-item `lowStockThreshold`. Check-in exists for accessories only.
- **Assign + accessories**: optional `accessoryIds[]` on assign checks out peripherals in the same action — convenience only, not bundling rules.
- **Scoped export**: `/export/assets` accepts the same filter query params as the list; empty result returns 400 with a clear message; filename encodes scope (`assets_loc3_filtered.csv`).
- **Branding**: official PNGs stored locally in `frontend/public/brand/` — no hotlinking the marketing site.

## Prompt 4 — Data visualizations

- **Chart library**: `@ant-design/plots` (G2-based) — matches the Ant Design stack, no second charting framework.
- **Color lives in the data, not the chrome**: UI accent stays `#2f54eb` on buttons/links; charts use `frontend/src/chartColors.ts` — a separate categorical palette and status-specific colors for donut/legend consistency.
- **Trends endpoint uses Postgres `date_trunc('month')`** on `assets.created_at`, zero-fills missing months server-side so the line chart never has gaps. Respects the same optional `locationId` filter as metric cards.
- **Import summary charts appear only on completed/failed jobs** with at least one outcome count; failure categories are heuristic buckets (duplicate / missing field / invalid / other) derived from error message text — no schema change on `ImportJob`.

## Prompt 6 — Audit, DataGrid, Help, ship

- **Excel-grade tables = shared `DataGrid` component** wrapping Ant Design `Table` + `react-resizable` column widths — not ag-Grid or ProTable (avoids a second grid framework; keeps Refine integration). Column order/visibility/widths persist in `localStorage` per `tableKey`.
- **Prompt 3 completed for real** — `theme.ts` tokens: primary `#1F1F1F`, secondary `#595959`, muted `#64748B`, placeholder `#6B7280`, disabled `#BFBFBF`, borders `#E2E8F0`; raised vs floating shadow tiers on Card/Modal/Dropdown.
- **11px subtext uses `#595959` not `#64748B`** — tertiary muted fails WCAG AA on tinted backgrounds (attention panel); spec hierarchy preserved for 14px+ body text.
- **Import errors carry structured `ImportErrorCode`** on each `ImportRowError`; frontend charts bucket by `code` first, message heuristics as fallback only.
- **Help = dedicated `/help` route** with sidebar nav, landing card grid, client-side search, and articles in `frontend/src/help/articles.ts`. Screenshots via `npm run screenshots` → `docs/screenshots/`.
- **Accessories/consumables seeded** in `prisma/seed.ts` so catalog pages are populated on fresh install.

## Prompt 8 — Self-audit, offboarding, full DataGrid sweep

- **Offboarding is the supported employee exit path** — `POST /employees/:id/offboard` returns assigned assets (or reassigns them), checks in open accessory checkouts, sets `Employee.isActive=false`, deactivates the linked `User`, and writes an audit entry. Consumable issue rows are never deleted (historical). Hard `DELETE /employees/:id` is blocked when any assignment/checkout/issue/request history exists.
- **Employee history is a merged timeline** — `GET /employees/:id/history` combines assignments, transfers, accessory checkouts/check-ins, consumable issues, asset requests, and audit rows, sorted newest-first (capped at 200 events). The profile UI exposes this on a **History** tab.
- **Employee list scoping enforced at API layer** — IT roles see everyone; managers see self + direct reports; employees see only themselves. `GET /employees/:id` now uses the same visibility rules as profile.
- **All primary list screens use `DataGrid`** — consumables, requests, maintenance, locations, and import jobs migrated in Prompt 8; assets/employees/audit/accessories were already on the component from Prompt 6.
- **Dashboard KPI cards drill down** — each metric card navigates to the assets list with the matching status (or warranty) filter pre-applied.
- **Help screenshots committed under `frontend/public/docs/screenshots/`** — captured via `npm run screenshots` (Playwright) against a running seeded stack; served by Vite at `/docs/screenshots/…`.

## Prompt 9 — Visual alignment (approved Claude Design mockup)

- **Approved mockup is the visual source of truth** — `design-reference/NewVision_Asset_Manager.html` + extracted tokens in `design-reference/DESIGN_TOKENS.md` supersede Prompt 3/6 written theme specs wherever they conflict.
- **Accent/links use `#0958D9` not `#1677FF`** — the lighter Ant Design default fails WCAG AA (4.1:1) on white; the mockup’s darker blue gives 6.16:1. Hover may use `#1677FF`.
- **KPI tiles use muted surface `#F1F4F8` + 4px top accent bar** — implemented in shared `KpiCard`; dashboard metrics renamed to mockup labels (e.g. “Total Assets”). Existing drill-down links preserved (visual pass only).
- **Secondary text bumped to 12–13px** — KPI labels, table body, attention panel details use `#334155`/`#475569` for readability on tinted backgrounds.
- **Global chrome via `theme.ts` + `index.css`** — canvas `#F8FAFC`, borders `#E9EDF2`, card radius 16/10px, subtle two-tier shadows. Screens not depicted in the mockup inherit the same tokens consistently.
- **Help screenshots re-captured after the visual pass** — `node scripts/capture-screenshots.mjs`; logout flow hardened (cookie clear + fallback storage wipe).

## Functionality audit (2026-09-10)

- **Related-record `take: 10` on asset GET was a data-loss bug** — assignment/transfer/maintenance history is now returned in full; the UI paginates at 10 rows so the page stays responsive.
- **Employee History omitted maintenance tickets** — now merged from tickets reported by the employee’s user account or filed against assets they have held. Per-source cap raised to 500; the old `slice(0, 200)` cutoff is gone so long-tenured staff are not silently truncated.
- **Truncated table cells must remain readable** — DataGrid wraps every cell in an overflow detector and shows the full value in a tooltip; “Wrap long text” in the Columns menu remains the Excel-style alternative.
- **Header ticket search used `?q=` which Refine never read** — it now writes the same `filters[0][field]=q` query the list already syncs, and the maintenance API matches numeric `q` to ticket id.
- **Styling left alone on the audit branch** — only functional CSS added (`nv-grid--wrap`, inactive row tint). Visual tokens were revisited in Prompt 12.

## Prompt 12 — Merge + final design system (2026-09-10)

- **PR #1 was a clean fast-forward** — `main` received `63860a2`, `0f4596d`, `c252759` (plus later dashboard/request commits already on the branch) via `gh pr merge --merge --delete-branch`. No conflicts.
- **Prompt 12 mockup wins over Prompt 9 and the earlier “remove charts” request** — `NewVision-standalone-src.html` is the approved visual source of truth. Dashboard charts are restored (donut, stacked location bar, 12-month growth). Breakdown lists are no longer the primary viz.
- **Accent `#1677FF` on KPI bars; buttons and links use `#0958D9`** — `#1677FF` on white is ~4.1:1 (fails WCAG AA for text). Logged rather than asking.
- **Login estate stats are seed figures (1,250 / 1,180 / 3 / 98.2%)** — there is no public unauthenticated metrics API; fabricating live numbers without auth would leak inventory. Display-only.
- **Forgot password is helpdesk-only** — no reset endpoint exists; the link explains IT Helpdesk / ext. 4120 rather than faking a flow.
- **Keep me signed in unchecked → `sessionStorage`** — checked (default) keeps JWT in `localStorage` as before so existing sessions and Playwright are unchanged.
- **Typeahead / attention `take` caps stay** — search (20/20/10/10) and dashboard attention (10) are summaries, not inventories. Profile/history/report issue lists were raised (50→500, 200→2000).
- **Accessories default to the mockup card grid** — Excel DataGrid remains behind a Cards/Table toggle so we do not drop sort/filter/export.
- **Sidebar Sign out carries `data-testid="logout-button"`** — header logout was removed to match the mockup; Playwright still finds the control.
- **Sign out always confirms first** — clicking the name opens an account menu; Sign out (menu or sidebar) opens “Sign out?”. Stay signed in cancels. Confirm uses `data-testid="logout-confirm"`.

## Prompt 13 — Tablet, light-only, first-run (2026-09-10)

- **Tablet is the responsive floor, not a phone rewrite.** The authenticated admin app must stay usable at ~768–1023px (floor-walk physical audit). Below Ant Design `lg` (992px) Refine already replaces the sider with a hamburger drawer. From 992–1023px `TabletCollapse` icon-collapses the 216px sider. KPI cards reflow (`xs={12}`), tables use existing `scroll.x` plus overflow-x, Help’s sider stacks, login stacks below 900px. Phone-width layout for dashboard/tables is an explicit non-goal; `/scan/:code` remains the phone-first surface.
- **Dark mode is declined.** The approved Prompt 12 system is light-only. We force light: `html[data-color-mode=light]`, `color-scheme: light`, CSS that keeps `#F8FAFC` under `prefers-color-scheme: dark`, and Ant Design `theme.defaultAlgorithm`. No dark-token counterpart — a filter/invert would fight the mockup.
- **First-run = empty estate, not empty filtered lists.** `isFreshInstall` is true only when asset, employee, and location counts are all zero. A database with locations but no assets uses the normal “No assets yet” empty state. Seeded demo (1,250 assets) never shows the Welcome card.
- **Welcome is not a wizard.** One card, four next actions (locations → Settings Categories → employees → assets). Categories UI and Add-employee modal were added so those links are not dead ends.
- **A migrate-only database has no users.** First-run still matters once an admin exists (`SEED_ON_START=false` after a manual user, tests that mock `/dashboard/setup`, or wiping operational rows). We did not add public signup.

## Prompts 14–16 — Helpdesk, digest, notes & manual edit (2026-09-10)

- **Growth chart zeros** were a timezone key mismatch: `date_trunc` + `toISOString().slice(0,7)` shifted IST midnight into the previous month so every lookup missed. Aggregation now keys months in UTC (`to_char(... AT TIME ZONE 'UTC', 'YYYY-MM')` + `buildTrendPoints`). Seed also stamps `createdAt` from purchase date so a reseed shows a real 12-month shape, not a single spike.
- **Select-all header text** was Ant Design `columnTitle: string` replacing the checkbox. DataGrid now wraps string titles as `aria-label` on the real checkbox; the assets list passes a checkbox node. Audited: only Assets (and now Support Tickets) use row selection.
- **MANAGE rainbow** was a raw `<div>` inside Ant Design `Menu`, which inherited chart-palette / per-character fill. It is now `Menu.ItemGroup` + forced muted `#64748b` (no gradient clip). Logos use `/brand/header-logo.png`, `/brand/favicon.png` (collapsed), `/brand/footer-logo.png` (Help), favicon in `index.html`.
- **Helpdesk RBAC:** Super Admin, IT Admin, and IT Support manage the full queue (`ticket:manage`). Employees see own + watched tickets and public comments only. Managers see own + direct reports + watched; they cannot assign, add internal notes, or log time. Documented here rather than inventing a sixth role.
- **IT Admin/Support seed users are linked to employee rows** (Ishan IT / Sunil Support) so staff can raise tickets as themselves. Create still requires `raisedByEmployeeId` or `actor.employeeId`.
- **Auto-assign** is least-loaded active IT Support unless `autoAssign === false`. Manual assign always works. Unassigned new tickets notify IT Admin + IT Support.
- **Email digest** is personal (`User.emailNotifyPref`), not admin-wide. In-app notifications are always immediate; only email is batched. Requesters/watchers stay on immediate email.
- **Manual edit** is Super Admin **and** IT Admin (they run the estate day-to-day). Never Manager or Employee. Every save needs a reason; audit `action=manual_override` is filterable. Notes are append-only. No Vendor entity exists, so notes skip vendors.
- **Attachments** are `bytea` on `TicketAttachment` (same pattern as import jobs), 8 MB, no executables.
- **Ticket numbers** are assigned after insert: temp `TMP-…` then `TCK-{id padded to 6}`.
- **Duplicate-of** is a one-way close + system comment, not a merge.
- **Category default priorities:** Access & Account and Network → High; General → Low; others → Medium. Requester can still change them.
- **Warranty 15–45 day text uses `#B45309`** not `#D97706`. Amber-500 on white is 3.18:1 (fails WCAG AA); amber-700 matches the existing StatusTag repair colour and passes axe after a reseed put “20 days” on the first assets page.
- **Jest e2e `forceExit: true`** because `ScheduleModule` cron (warranty + ticket digest) keeps handles open after suites finish. Tests themselves pass; without forceExit the process can hang/crash on Windows.

## Prompt 17 — Bundle split, cumulative growth, polish (2026-09-10)

- **Growth stays named “Growth”** and is now a cumulative running total (assets created before the window are the baseline). Per-month additions stay as a second series labelled “Added this month” so the primary line actually climbs. Renaming the card to “Assets added per month” was the worse option for this audience.
- **Ant Design cannot be split below ~1.2 MB** without circular chunks (`antd` ↔ `@ant-design/icons` ↔ `rc-*`). Charts (G2) are their own chunks so login never downloads them. `chunkSizeWarningLimit` is 1300 KB for that one irreducible vendor chunk; every other JS chunk is under 800 KB.
- **React Router does not bubble `Outlet` suspends** to a `Suspense` wrapped around `<Routes>`. An inner `<Suspense>` around `<Outlet>` inside `ThemedLayout` is required or the first lazy dashboard paint can miss Playwright’s login wait.
- **Prisma adapter uses an explicit `pg.Pool`** (`max: 10`) instead of relying on `PrismaPg({ connectionString })` alone, so concurrent Nest requests do not serialize on one client.
- **Global search is the ⌘K command palette**, not a header AutoComplete. Playwright and the `/` shortcut open that palette.
- **Placeholder text uses `#64748B`** (same as muted body) so 13px Ant Design placeholders pass WCAG AA. `#94A3B8` on white is 2.56:1.

## Prompt 18 — Real helpdesk emails (2026-09-10)

- **HTML templates live in `backend/src/notifications/ticket-email-templates.ts`**, one function per event returning `{ subject, text, html }`; `MailerService.send` gained an optional `html` field rather than a second send path, so the existing SMTP-or-console fallback (Phase 2) needed no rework.
- **The requester now gets a creation-confirmation email** — this event previously had no email at all (only staff/assignee were notified on create). Added via the same `notifyUsers` helper so it also creates the in-app notification, honoring the existing digest-skip rule for staff.
- **Email HTML is a single inline-styled shell function**, not per-template markup, so the logo/accent/footer stay consistent and only the heading/body/CTA vary. No email CSS framework — table-based layout for client compatibility.
- **Tests spy on `MailerService.send` in e2e, not mocked unit tests** — the existing e2e suite already seeds real tickets/users, so asserting on `sendSpy.mock.calls` there covers trigger logic and template selection without adding a second Nest test harness pattern.

## Prompt 19 — Re-verified against the reference mockup, futuristic pass reverted (2026-09-10)

- **The Prompt 18 "futuristic" visual pass (glow, glass/backdrop-blur, gradient mesh, bento
  dashboard grid) is reverted**, per explicit instruction that it's superseded by
  `design-reference/NewVision-standalone-src.html`. Re-reading that file directly confirmed the
  already-implemented Prompt 12 token system matches it closely — the actual problem was the
  futuristic CSS layered on top fighting those tokens, not the tokens being wrong. Reverting was
  mostly subtraction: delete the added CSS block, restore the plain `Row`/`Col` KPI and chart
  grids, drop the live-pulse dot and the KPI hero/sparkline/footer props.
- **The `⌘K` command palette is kept**, restyled plain (opaque white, `#E4E9F0` border, the
  reference's own notification-panel shadow) instead of glass. It's a functional upgrade over the
  old header `AutoComplete` (jump-to-screen, quick actions), not a visual style choice, so it
  survives the revert — this was Prompt 17's decision, reaffirmed here rather than undone.
- **"Updated N minutes ago" on the dashboard is kept** — it's literally in the mockup's own copy,
  just implemented as live relative text (`LiveTimestamp`) instead of a hardcoded string, and with
  no pulsing dot (the dot was the futuristic part, not the text).
- **Fixed a real axe-core failure surfaced while re-testing**: AntD's `color="green"` preset tag
  (`#389e0d` on `#f6ffed`, 3.37:1) on the asset-notes "Active" tag and the command palette's result
  tags. Replaced with the project's already-established safe pairs (e.g. `#15803D`/`#F0FDF4` for
  green, matching `StatusTag`), not a new palette.
- **Declined to add the mockup's floating "?" help-launcher button** (fixed bottom-right circle).
  The header's labelled "Help" button already covers this entry point and is more accessible
  (visible label vs. an icon-only FAB) — a deliberate, logged divergence rather than an oversight.

## Prompt 20 — Visual rebuild, role shells, email-in (2026-09-10)

- **Custom sider, not Refine `ThemedSider`.** The built-in sider could not match the mockup (216px, pinned logo/footer, thin inner scroll). `AppSider` is the shell; Refine layout still supplies collapse context on tablet.
- **Dashboard Growth chart deleted from the UI**, not hidden. Status/location are proportional lists so an admin can answer “how many / who has them / what’s broken” in seconds. The `/dashboard/trends` API remains for any leftover tooling but is unused by the home screens.
- **Email-in default = IMAP poll + raw ingest webhook.** One shared mailbox (`HELPDESK_MAILBOX`). Matching is header `In-Reply-To`/`References` first, then `[TCK-000123]` in the subject — no fuzzy sender+subject merge. Unrecognized From still creates a ticket with `unmatchedSender`; we never auto-create an Employee.
- **Public `/scan/:code` omits assignee name and serial** — a QR sticker is photographable. Status (Assigned / Available / …) is enough to confirm the asset without leaking PII.
- **First-response SLA is three numbers in Settings**, not a rules engine. The clock pauses in `waiting_on_employee`. Business hours and escalation stay in `FUTURE_IDEAS.md`.
- **Access tokens are 15 minutes + a 7-day rotating refresh token.** Long-lived 8h JWTs were a real limitation outside a trusted LAN.

## Help docs rebuild (MkDocs Material structure, in-app)

- **Stay inside the React app, do not host MkDocs.** The reference site (`ing-bank.github.io/ingenious-doc`) is the structural model (fixed header, skip-link, collapsible 2–3 level nav, auto ToC, At a Glance cards, client-side search, admonitions). NewVision tokens stay (`#F8FAFC` canvas, `#0958D9` links) — ING blue/orange is not copied.
- **Content is a structured `helpArticles` model**, not one-off JSX per page, so search + ToC stay generic. Articles describe what actually works today, including known gaps (warranty dump mixes expired rows, ticket timeline can say “Not started” on an in-progress ticket, IT Support has no Settings nav, email-in is unproven without IMAP, public scan omits assignee/serial).
- **Screenshots are captured from the running app** via `frontend/scripts/capture-screenshots.mjs`. The script must not wait for a “Dashboard” heading — Employees land on My IT.
- **`?` stays Help; ⌘K is command palette** (and docs search while already in Help). A shortcuts overlay must use a different key later (`Shift+/`), not `?`.
- **Home is a nav link** to `/help` (landing), not a fake article, so the At a Glance grid remains the docs home.

## Prompt 22 — item 1 (ticket timeline)

- **Current status is evidence work started.** If a ticket is `assigned` / `in_progress` / `waiting_on_employee` and there is no assign/status audit, backfill “Work started” from `updatedAt` rather than showing “Not started”. Also treat `reopened` / `resolved` / `closed` the same way — those states cannot honestly be “not started”. Open + unassigned still shows Not started.

## Prompt 22 — item 6 (My work)

- **Needs attention is now an ordered My work list.** Priority is my overdue tickets, unassigned, waiting on the employee 3+ days, stale repairs, incomplete checklists, contracts ending within 14 days, then warranties expiring within 14 days. Low-stock and to-fulfill stay on the API for the sider badge but are not mixed into this morning list. IT Admin keeps KPI tiles; IT Support’s home *is* the list. Unassigned rows expose Assign to me. Waiting threshold is 3 days (not configurable) so the list stays predictable.

## Prompt 22 — item 7 (contracts + checklists)

- **Make the existing queries visible.** Templates already lived in a migration; they were invisible once you left the profile. Seed one contractor (`EMP-00002`, ends in 8 days) and one incomplete onboard checklist (`EMP-00001`). Employees list gets a Follow-up chip (contracts ending 14d / incomplete checklist) plus row tags; the profile warns when a contract is due. Dashboard My work already had the queries from #6; contracts now require `employmentType=contract` so a stray end date on a permanent employee is ignored.

## Prompt 22 — item 8 (canned macros)

- **Status rides along with the public reply.** Canned responses store optional `statusOnSend` (`waiting_on_employee` | `resolved`). The comment endpoint applies it only for staff public replies, not internal notes. Open tickets are allowed to jump to waiting/resolved so a first-reply macro does not get stuck.

## UI polish (tickets / employees / search) — 2026-09-11

- **Employees list:** employment status (`Active` / `Contract Active` / …) lives only in the Status column. The name cell keeps the person + `EMP-` code (plus onboard/offboard and contract-ending tags on the sub-line). Duplicate green Active next to the name was a visual bug, not two fields.
- **Tickets toolbar:** search + **Legend** sit on the left of the DataGrid toolbar; CSV/PDF / Compact / Columns / Export CSV sit on the right. Groups wrap; we dropped `overflow-x: auto` so the row no longer clips into a lone circle under the search.

## Prompt 22 — remainder (#9–#20)

- **Issue kits are named checkout recipes**, not a workflow engine. Next available asset in category (+ optional location) plus accessory IDs already supported on assign. Settings CRUD; employee runbook “Issue kit”.
- **Bulk assign is best-effort** like bulk retire. Only `available` rows succeed; failures are counted, not rolled back.
- **Audit stamp is staff-only on asset show**, not the public `/scan/:code` card (PII-safe, read-only). Next due defaults to last + 365 days. My work does **not** list never-audited assets (the seed pile would drown the morning list); the Assets filter “Not audited in 12 months” does include never-audited.
- **Loaner `expectedReturnAt` never auto-checks-in.** Overdue rows are a nudge on My work.
- **`?` stays Help.** The shortcuts overlay is **Ctrl+/** so it does not fight Help on US keyboards (where Shift+/ types `?`).
- **Presence is an in-memory 10s heartbeat**, no WebSocket, pruned after 25s. Fine for two staff; not a lock.
- **EMP-code search is exact** when `q` matches `EMP-…`. Name searches still return many Kabirs; the picker shows the match count.
- **Screenshot paste:** tickets accept Snipping Tool images via Ctrl+V on the attach zone or **Paste screenshot**, in addition to file upload.
- **⌘K colour only:** header search and palette rows got a blue focus ring, left-border on the active row, and kbd chips. Search behaviour is unchanged.
- **Muted text token:** `#64748B` on `#F4F8FC` card heads was 4.45:1 (just under WCAG AA). `COLOR_TEXT_MUTED` is `#475569`.
- **Sign out** is `role="button"` (it is not inside a `menu`).

## Prompt 23 v2 — Vendor & Procurement

- **Parallel approval is the default** (matches the real To-list email). A matrix rule may set `sequential`; the requisition copies that routing. Required approvers are every active user with the matching role at that threshold — fine for NewVision’s five demo accounts.
- **Material vs trivial edits:** vendor, category, procurement type, tax, total, or any line-item change resets the approval chain and increments `revision`. Title, business requirement, dates, locations, budget head, and make/model do not.
- **Managers** see their team’s requisitions (owner is their report, or they are an approver) and can raise one. They do not see Vendors / POs / Contracts. IT Support is out of procurement.
- **Bank-detail edits** on an already-active vendor go to `bankChangePending` rather than applying instantly. Highest fraud-risk field.
- **3-way match tolerance is 2%** (`PROCUREMENT_MATCH_TOLERANCE_PCT`). Exception invoices need a note before payment can be approved.
- **Handoff never deletes.** Amending/cancelling a PO or voiding a GRN flags `needsReconciliation` on auto-created assets/handoffs.
- **Not built (logged in FUTURE_IDEAS.md):** e-sourcing, supplier portal, PunchOut, full CLM, multi-entity consolidation, OCR invoices, GL, payment execution.

## Prompt 24 — Teams-style Team Chat

- **Full-page `/chat` is the primary UX** (closer to Teams for daily use). The header Chat button navigates there and keeps the unread badge; the old drawer is gone.
- **Opening `/chat` with no `?c=` lands on `#it-ops`**, not whichever DM had the latest message. Conversation clicks update React state immediately so Send cannot race the URL.
- **Kept Prisma type `dm`** (not renamed to `direct`) so existing rows stay valid. The UI labels them Direct.
- **Existing `#it-ops` group rows are promoted to `channel` in `ensureDefaultChannels`** after migrate (Postgres cannot use a newly added enum value in the same migration transaction).
- **Mention tokens are `[@Name](mention:id)`** plus `@channel` / `@here` — structured ids, not display-name matching.
- **WebSockets shipped** (`/chat` Socket.IO namespace, JWT in handshake `auth.token`). HTTP polling remains as unread fallback on the launcher.
- **Who can delete:** sender, or Super Admin / IT Admin for moderation. IT Support cannot delete others’ messages.
- **Read receipts** only on DMs/groups with ≤8 members. Pin/bookmark/forward deferred.
- **Not built:** calls, meetings, screen share, guests, Teams federation.

## Leftovers pass — asset codes, dashboard, search, Teams Comfy (2026-09-11)

- **Custom asset numbers are first-class.** Create accepts an optional typed code; blank still auto-assigns `AST-{LOC}-{CAT}-{SEQ}`. Update now persists `assetCode` (it used to drop it). Rename confirms because old QR stickers and scan links die. Format is letters/digits/hyphen, min 3 — sticker codes like `NV-LAP-1042` are allowed if unique.
- **My work stays a scrolled list** (`maxHeight: 420`), same simple rows as before (label + detail, Assign / Open). Only that card’s header caret collapses it; the browser remembers `nv.dash.collapse.my-work`. Status distribution, assets by location, and support tickets stay open — no caret. This is not the ChatGPT sider toggle.
- **Header search is a 360–480px rounded-rect field** (10px radius) that still only opens ⌘K. Same family on the palette input.
- **Chat layout is classic Teams Comfy:** own messages right, others left, including `#it-ops` and threads. Overflow stays inside `max-width: min(72%, 560px)` bubbles. A leftover-scan had said “keep Slack-left”; this pass is the promised Teams replica, so we flipped once and will not flip again.
- **Clipboard prefers real files over Office/Explorer thumbnails.** Image-only paste is still a screenshot. Ctrl+Shift+V stays plain text.
- **Sign-out awaits `useLogout().mutateAsync` then hard-assigns `/login`** so a leftover token cannot bounce the user back.
- **Destructive confirms** go through `useConfirmAction` / Popconfirm. Save, Send, Assign to me, and existing reason modals are not double-wrapped.

## Prompt 26 — Simplification pass + chat completion verification

- **Part 2 (Teams-style chat) was verified genuinely complete, not re-built.** Every item on the brief's checklist — channels (create/rename/archive/join/leave/members), DMs/groups, threaded replies, rich-text toolbar, real @mention autocomplete with typed+deep-linked notifications, emoji reactions with a per-viewer "mine" indicator, attachments, edit/delete with tombstone + audit trail, record-link unfurling that resolves to the real row (not a search fallback), presence with color+shape, live typing indicators, and WebSocket-driven real-time delivery for messages/reactions/unread/presence — was exercised live with two concurrent logged-in sessions (one Socket.IO connection per tab) and cross-checked against `chat_*` audit log rows and notification records, not just read from code. No gaps were found; no chat code changed in this pass.
- **Manual correction and notes extended to procurement** (Vendor, PurchaseRequisition, PurchaseOrder, VendorContract) — Part 1.2's "extend manual editing to every record type where it makes sense" was a genuine, confirmed gap: these four had no way to fix a typo or leave a note without the module's full formal workflow, unlike every other entity type.
- **Procurement manual-edit fields are deliberately narrow**, excluding `status`, financial totals (`totalCost`, `total`, `taxAmount`), and relational ids (`vendorId`, `requisitionId`) — those already have dedicated, audited workflows (status-change endpoints, PO amend, bank re-approval) that a generic field patch must not be able to bypass. Only descriptive/free-text fields and non-workflow-critical dates are editable (see `records.service.ts` `VENDOR_FIELDS` / `REQUISITION_FIELDS` / `PURCHASE_ORDER_FIELDS` / `VENDOR_CONTRACT_FIELDS`). This mirrors the existing pattern on Assets/Tickets (`status` excluded there too).
- **Notes on `PurchaseRequisition` follow the existing Manager-scoping convention**: a Manager can view/add notes only on a requisition where they are `requesterId` (same field `requisitions.service.ts` already uses to scope the Manager's own list/approve access) — not on their team's or anyone else's. Vendor/PurchaseOrder/VendorContract notes stay Super Admin / IT Admin only, matching who can even navigate to those pages (`navForRole`).
- **Part 1.1 (click-reduction / pre-fill sweep)** was finished in the Prompt 27 pass (see below), not in the first Prompt 26 sitting.

## Prompt 26 leftovers + Prompt 27 go-live (2026-09-12)

- **`RoleRouteGuard` allows `/employees/show/:id` for every signed-in role.** Employee and Manager nav omit the Employees list (correct), but the account-menu Profile link and contact cards were bouncing to Home. The API still 403s profiles the viewer may not see.
- **Self-service profile and ticket typo-fixes are regular `update` audits, not `manual_override`.** Manual correction still requires a reason and is Super Admin / IT Admin only. An employee fixing their own phone or a subject typo is not an override of a formal workflow; it is still written to `audit_logs`.
- **Requester ticket PATCH is subject/description only.** Status, assignee, and priority stay on the existing transition / assign / manual-correction paths so an employee cannot close or escalate their own ticket by editing it.
- **Resend over SMTP in production.** Render Free blocks outbound 587/465. `MailerService` prefers `RESEND_API_KEY` (HTTPS) and keeps SMTP for environments where those ports work. Console remains the local default.
- **Stay on Render, do not switch hosts.** The API is a persistent Docker web service (needed for Socket.IO, `@nestjs/schedule`, and the IMAP poller). Serverless would sleep those. Free-tier sleep is mitigated by `.github/workflows/keep-alive.yml`, not by moving providers.
- **`SEED_MODE=bootstrap` on an empty production database, demo seed only in local/dev.** The existing Render Postgres already has demo users; `SEED_IF_EMPTY=true` will never wipe them. A brand-new empty database gets one Super Admin from `BOOTSTRAP_ADMIN_*`, not 1,250 demo assets.
- **Do not invent a production mailbox or Resend account.** Email-in and live outbound mail stay unproven until an operator pastes real `RESEND_API_KEY` / `IMAP_*` values into the Render dashboard. The code path is ready; claiming a real inbox test without those secrets would be false.
- **Chat was not rebuilt.** Prompt 26 already verified every Teams checklist item live. This pass only changed Prisma `update` → `updateMany` on presence writes so a missing user row cannot crash the gateway.

## Prompt 29 — Help (2026-09-14)

- **Team Chat is its own Help category**, not a child of Support tickets. The product already treats Chat as a top-level staff app; burying it under tickets hid it on the glance grid.
- **Screenshots are regenerated, not hand-edited.** `frontend/scripts/capture-screenshots.mjs` (`npm run screenshots`) logs in as the role that owns the screen, 1280×800 light theme. Optional CSS badges are painted onto the PNG; captions under the figure stay the numbered list.
- **Help markdown links are underlined.** Color-only `#0958D9` in body copy failed axe `link-in-text-block`.
- **Accessories Help describes Cards as the default**, because that is what the running app shows; Table is the Excel-grade toggle.
- **IT Support Settings path is the avatar menu.** The previous article claimed they could not reach digest preferences; the account popover already links to `/settings`.
- **No approval-matrix Settings tab** — To/Cc live on each requisition. Documented rather than inventing a screen.
- **First Super Admin is bootstrap seed**, not an in-app wizard (`SEED_MODE=bootstrap`).

## Prompt 30 — QA (2026-09-14)

- **AntD preset `gold` is banned for SLA chips.** Same WCAG lesson as other status tags: explicit `#92400e` on `#fffbeb` plus an icon.
- **Do not mark production email or a 5-role production walk as pass** without secrets / a live Render session this sitting. Local Help + axe were actually run.

## Prompt 34 — Chat chrome (2026-09-14)

- **`/chat` leaves `ThemedLayout`**, same `Authenticated` escape Help already used. Two left rails was the replica-killer. The console Chat button and unread badge still route here; **Back to console** returns to the sider.
- **Comfy stays the default** (own messages right). A **Compact** toggle (all left, tighter) is opt-in and stored in `localStorage` (`nv.chat.density`) so 2025 Compact users can stop saying “WhatsApp” without flipping everyone.
- **Find lives in the rail**, not a Modal. `GET /chat/search` is unchanged.
- **Mentions pill** uses `GET /chat/mentions` (existing `ChatMention` rows for the current user). Mention storage / Socket.IO / upload allow-lists were not touched.
- **Mark all read** is `POST /chat/read-all` and updates **only** the actor’s memberships.
- **Playwright pings** are deleted after each chat spec. `ensureDefaultChannels` also soft-deletes `Prompt24 ping` / `Bubble ping` rows older than one hour, then seeds a starter if a default channel has no live messages.
- **Chat `tenantId` on writes** stays in the running local `dist` (the tenanted DB column is NOT NULL without a SQL default). Prompt 34 source omits those fields so it still typechecks on `main` before Prompt 37; Prisma `@default(1)` covers a rebuild against the tenant schema.
- **Quote-reply, Favorites/pin, GIFs, calls, and purple theming stay out** — logged in `FUTURE_IDEAS.md`.

## Prompt 36 — Vendor master & ticket depth (2026-09-14)

- **A1 unique invoices:** `@@unique([vendorId, invoiceNumber])` plus a 409 before insert. Super Admin may set `correction: true` to store `INV-…-CORR` / `-CORR2` instead of colliding — IT Admin cannot. A same-vendor + amount + date hit within 7 days is a warning on the 201, not a block. Existing duplicate rows (if any) are renamed `…-DUP-{id}` in the migration so the unique index can apply.
- **Sequential ship vs Render wait:** each Prompt 36 item is committed and pushed on its own. Live verification is against the API/UI after the deploy that contains that commit; we do not wait out every Hobby-plan build before starting the next item's code, because twenty serial deploys would dominate the sitting. Logged so later items are not accused of batching.
- **Sibling Prompt 32 WIP** (password/session hardening) stays in the working tree until that prompt is finished; A1 does not take those auth files.

## Prompt 32 — security first, then loops, then true docs (2026-09-14)

- **Access token stays in sessionStorage** (needed for the existing Bearer client). **Refresh is an httpOnly cookie** (`nv_refresh`). XSS can still steal the access token until it expires (~30m); CSP + Helmet mitigate, they do not eliminate that residual. Documented rather than a full cookie-only rewrite (that would be a larger SPA auth change).
- **Password set minimum is 12** everywhere; login DTO stays `MinLength(1)` so we don't leak “too short” vs “wrong password”.
- **Demo accounts** may exist in a seed database; they **must not authenticate in production** (`ALLOW_DEMO_LOGINS`). Login UI prints them only in Vite `DEV`.
- **Super Admin tickets:** lazily create/link an Employee row rather than making `raisedById` optional (tickets stay “a person in the directory”).
- **IT Support can fulfill requests** (record issued asset/kit) instead of a dead Requests nav item.
- **Vendor names for repairs** are `/vendors/options` (no bank fields). Full vendor CRUD stays Super Admin / IT Admin.
- **axe `aria-hidden-focus`** is on again; Ant Design dropdown/modal portals are excluded because they are upstream focus-trap bugs, not our chrome.

## Prompt 38 — joining date, hardware house, sticky chrome, nv-phone (2026-09-14)

- **Joining date stays required** on create (default today). It is the offer/actual start, never `createdAt`. List/profile show Joined + tenure.
- **Hardware house is three URLs** (`/assets`, `/accessories`, `/consumables`) plus in-page tabs. Sidebar keeps three items so existing e2e locators still work. Accessories stay quantity stock; serials live on Assets (MOU / HDS / KEY / CAM / DOCK). Checkout duplicate serials **warn, do not unique-constrain**.
- **Employee My kit** (nav + home) shows assigned assets **and** accessory checkouts. Checkout serials are **IT-only**.
- **Probation default is 90 days** from DOJ when left blank. Offboard requires `lastWorkingDate`.
- **Sticky stack** uses existing card/page colors (`#f4f8fc` / `#fff`), not a new palette. No dark mode. ChipSelect / status tones unchanged.
- **`nv-phone` is ≤639px Employee + lookup**, not a 20-module admin rewrite. Chat and procurement show a desktop-only banner. Phone-width Excel-on-390 stays in `FUTURE_IDEAS.md`.

## Prompt 37 — multi-tenant SaaS (2026-09-14)

- **Isolation model = shared Postgres + `tenantId` on every operational table (B), not database-per-tenant (A).** Render Blueprint has one Postgres; self-serve signup cannot provision a new database. Roles and Permissions stay global. `User.email` stays globally unique (one login per human). Business keys (`location.code`, `employeeCode`, `assetCode`, ticket numbers, vendor codes) are `@@unique([tenantId, field])`. Prisma `$extends` injects `tenantId` on every query; missing ALS context **fail-closed**. Raw SQL (`dashboard/trends`) adds `tenant_id` by hand. Adversarial e2e: two signups, A cannot `GET` B’s assets/employees/tickets/vendors.
- **14-day trial = Team modules**, then fall back to **Starter** (Home, Assets, Employees, Tickets, Scan, Settings). No per-asset metering; IT **seat cap** (default 10) only. Payment is external (Zoho Books + `PATCH /api/platform/tenants/:id` with `PLATFORM_ADMIN_SECRET`).
- **Legal/GST/DPA/MSA/SOC2 are not in the repo.** In-app hooks: `/trust` placeholders, `GET /api/tenant/export`, `DELETE /api/tenant`, `GET /api/tenant/billing`. Health check runs `SELECT 1` and advertises `HOSTING_REGION` (Singapore — demo only; India on request). Do not recreate Render Postgres to “move” region.
- **Onboarding is a 5-step checklist**, not schema completeness. Trial tenants never get the 1,250-row internal seed; `POST /api/tenant/onboarding/sample` loads ~25 laptops.
- **QR URLs** prefer `/scan/:slug/:code` (API `/api/public/assets/t/:slug/:code`). Bare `/scan/:code` still works when the code is unique in the whole database.

## Prompt 35 — daily ITIS practice (2026-09-14)

- **Item 1 playbook** is NewVision + a ticket record of M365/VPN/biometric resets — no Entra API. Identity verify is a timestamp; reset/IdP buttons stay gated on it.
- **Item 2 how-tos** are 12 static `/help` articles (`For employees`), not a KB engine. Office SSIDs (`NV-Pune` / `NV-Hyd` / `NV-Bhopal`) are invented labels until IT publishes the real ones. My IT waits for identity before rendering so employees are not dumped on the estate dashboard.
- **Item 3 scan-to-audit** already had `audit-by-code` + 12-month unaudited attention. Added **confirm location** on the sticker page (staff only). Public card exposes `locationId` (office, not PII) so the select can default.
- **Item 4 OEM claim** lives on `AssetMaintenance` (`coverage`, `oemCaseId`, `rmaNumber`, `claimInvoiceNo`, `incidentKind`). Filing copies serial + invoice into notes, sends `reported → under_repair`, and sets `loanerNeeded` when the assignee has no other assigned device. Linked AMC/warranty contracts are read from `VendorContractAsset`, not duplicated.




