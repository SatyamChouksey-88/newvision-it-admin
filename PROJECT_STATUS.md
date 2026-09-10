# NewVision — Project Status & Gap Audit

This document is the current gap audit, cross-checked against the codebase after **Prompt 19** (real helpdesk emails; re-verified against `design-reference/NewVision-standalone-src.html` after reverting an interim visual pass that had drifted from it). It is not a copy of an earlier prompt’s status. For the build log see `PROGRESS.md`; for judgment calls see `DECISIONS.md`.

## 1. What’s covered (Phases 1–4 — core product)

- Auth + 5-role RBAC (Super Admin, IT Admin, IT Support, Manager, Employee)
- Asset CRUD, categories, locations, departments, employees
- Assign / Transfer / Retire with an enforced backend lifecycle state machine
- Global search across asset code, serial, employee, model, location, and maintenance ticket id
- Dashboard: KPI cards, location filter, warranty-expiring table, needs-attention panel
- CSV/Excel import and export for assets and employees (sync + background import jobs)
- Append-only audit log with a restricted viewer
- Maintenance/repair tickets with vendor/cost/completion tracking
- Warranty expiry alerts (30/60/90-day scheduled email job)
- Reports (asset / employee / location / warranty / supplies), CSV + PDF
- Employee profile (assigned assets, accessories, consumables, requests, merged history)
- Background-job bulk import with dry-run, duplicate detection, rollback (Phase 3)
- Manual HR-export reconciliation (Phase 3)
- QR code generation + public `/scan/:code` page, REST API + webhooks (Phase 4)
- Tech stack: React + Refine + Ant Design 5, NestJS + PostgreSQL + Prisma, Docker, CI

## 2. What’s covered (Prompt 2 — review, requests, accessories, UX)

- Code review against Phases 1–4 (lifecycle, audit, permissions, N+1, errors)
- Single-step asset/accessory requests (employee → manager → IT fulfill) — not a workflow engine
- Accessories (checkout/check-in) and consumables (quantity + low-stock), separate from serialized assets
- Pagination, sorting, filtering on every primary list
- Copy-to-clipboard on IDs/codes; scope-aware export
- Import run history; field-level failure reasons
- In-app notifications; loading/empty/skeleton states
- axe-core Playwright checks on dashboard, assets list, tickets list, raise-ticket form, and asset notes
- Official branding in `frontend/public/brand/`

## 3. What’s covered (Prompts 3–4 — visual hierarchy and charts)

- Prompt 3 text hierarchy, two-tier shadows, and copy-button polish — later superseded visually by Prompts 9/12 tokens, but the work shipped
- Prompt 4 dashboard charts: status donut, per-location bar, 12-month trend, Total KPI sparkline
- Dedicated chart palette in `frontend/src/chartColors.ts` (separate from UI chrome)
- Import-job outcome donut + failure-category bar on completed jobs

## 4. What’s covered (Prompt 6 — DataGrid, Help, structured import errors)

- Shared Excel-grade `DataGrid` (sort, filter, resize, reorder, show/hide, sticky header, density, Ctrl+C, CSV export)
- `/help` documentation section: search, category nav, articles, annotated screenshots
- Structured `ImportErrorCode` on each import row error (charts bucket by code first)
- Accessories/consumables included in the demo seed

## 5. What’s covered (Prompt 8 — self-audit, offboarding, history, drill-down)

- Employee offboarding: return or reassign assets, check in accessories, deactivate linked user, keep history
- Employee History tab — merged timeline (assignments, transfers, accessories, consumables, requests, maintenance, audit)
- Employee list/profile RBAC: IT sees all; managers see self + reports; employees see self
- DataGrid on remaining lists (consumables, requests, maintenance, locations, import jobs)
- Dashboard KPI cards link to the filtered assets list
- Help screenshots committed under `frontend/public/docs/screenshots/`

## 6. What’s covered (Prompts 9 / 12 — design system + audit-branch merge)

- Approved mockup tokens in `design-reference/DESIGN_TOKENS.md` / `frontend/src/theme.ts` (canvas `#F8FAFC`, links `#0958D9`, 8px radii, KPI accent bars)
- Login two-column + estate panel; 216px sider with MANAGE + Sign out; 52px header with breadcrumb + ⌘K
- Dashboard KPI tiles, Needs attention + Dismiss all, charts restored to match the mockup
- Accessories card grid (table toggle), maintenance status chips, reports card grid, Help article chrome
- Employee profile tabs: Assigned assets / Accessories & consumables / History / Requests
- Keep me signed in uses `sessionStorage` when unchecked; warranty urgency ≤14 red / ≤45 amber
- Functionality audit (history truncation, DataGrid overflow tooltips, ticket search, inactive-employee guards) merged to `main` via **PR #1**
- DataGrid also on webhooks, reconciliation findings, and import mapping/errors

## 7. What’s covered (Prompt 13 — docs, tablet, light-only, first-run)

- `PROJECT_STATUS.md` rewritten against the live product (this file)
- **Tablet-width admin (~768–1023px):** below 992px the sider is Refine’s hamburger drawer; 992–1023px it icon-collapses. KPI grid reflows (`xs={12}`), tables scroll horizontally, Help nav stacks, login stacks below 900px. Phone-width rewrite of the admin app is an explicit non-goal; the public scan page stays phone-first
- **Light mode only:** OS `prefers-color-scheme: dark` is forced back to the approved light tokens (`data-color-mode="light"`, `color-scheme: light`, Ant Design `defaultAlgorithm`). No dark-token set
- **First-run empty estate:** `GET /api/dashboard/setup` reports `freshInstall` only when assets, employees, and locations are all zero. Dashboard + assets/employees/locations lists show **Welcome to NewVision** with next actions. Seeded demo data never shows that card
- Settings → **Categories** tab (create LAP/MON/…) and Employees → **Add employee**, so the first-run steps have real screens
- Public `/scan/:code` restyled to Prompt 12 tokens; still a single-column 420px card, no login

## 7b. What’s covered (Prompts 14–16 — IT helpdesk, CSAT, notes)

- Three bug fixes: 12-month Growth chart (UTC month keys + chart binding), DataGrid select-all checkbox (not wrapped label text), sidebar MANAGE label (single muted color) plus a logo/favicon audit against `frontend/public/brand/`
- Spiceworks-style **Support Tickets** module, separate from Maintenance and Asset Requests: lifecycle, public/internal comments, watchers, time logs, canned responses, templates, attachments, optional asset link, overdue indicator, reports, RBAC, Help
- CSAT 1–5 on resolve (once; dropped on reopen); IT staff email Immediate vs Daily digest (in-app always immediate); quick/saved views; full-text search; contact cards; duplicate-of linking; bulk assign/close; category default priority; CSV/PDF export
- Append-only **Notes** on major records; **Manual correction** for Super Admin and IT Admin (mandatory reason + confirm old→new); backfilled history tagged; audit log filter `manual_override`

## 7c. What’s covered (Prompt 17 — verified enhancement pass)

- Route-level `React.lazy` + inner `Suspense` around the layout `Outlet`; vendor `manualChunks` (G2 charts, Ant Design, Refine, React). Production build: no 3.6 MB monolith; Ant Design ~1.2 MB is the one irreducible vendor chunk
- Growth card shows a **cumulative estate total** (climbing line) plus labelled monthly additions; API carries a pre-window baseline
- Confirmed in the running UI: growth chart scales with seed data, select-all is a checkbox, MANAGE is one muted color, logos/favicon on login, sider, collapsed sider, and tab
- Helpdesk/notes empty and loading states; axe-core on ticketing + notes; command palette is the global search entry
- Verified tests (2026-09-10): **58** backend unit + **84** backend integration + **55** Playwright

## 7d. What’s covered (Prompts 18–19 — real helpdesk emails; re-verified against the reference mockup)

- Every support-ticket lifecycle event sends a real, branded HTML email — created (requester confirmation, which didn't exist before), assigned, unassigned-to-staff, comment, status change, resolve→rate prompt, daily digest. Falls back to plain text / console log with no SMTP configured; `backend/test/ticket-emails.e2e-spec.ts` spies the mailer and asserts subject/template per event.
- An interim "futuristic" visual pass (glow, glass/backdrop-blur, gradient mesh, bento dashboard) was implemented, then explicitly reverted after re-reading `design-reference/NewVision-standalone-src.html` directly — the app now matches that file's plain, flat treatment again (opaque cards, equal-size grids, the existing `0 2px 6px` hover shadow). The `⌘K` command palette and the "Updated Ns ago" dashboard copy were kept as genuine functional/copy improvements, not visual style.
- Found and fixed a real axe-core failure while re-testing (AntD's `color="green"` preset tag, 3.37:1 contrast) on asset notes and the command palette.
- Confirmed in the running UI via screenshots: login, dashboard, header/shell, assets list, and Help all match the reference's layout and treatment.
- Verified tests (2026-09-10, unchanged by the revert): **58** backend unit + **84** backend integration + **55** Playwright (incl. axe-core)

## 8. What’s explicitly and deliberately excluded (by design, not by oversight)

These came up in the original research document but were kept out because they belong to full enterprise ITSM/CMDB suites and don’t fit a ~1,250-asset, 3-location internal tool:

- CMDB / configuration-item relationship mapping and dependency graphs
- IT service catalog, SLA tracking, service lifecycle management
- Ticketing/ITSM platform, change & release management (a simple Spiceworks-style helpdesk *was* added in Prompts 14–15; full ITSM/SLA/email-in is still out)
- IT governance, security/vulnerability/patch management modules
- IAM/Joiner-Mover-Leaver automation, live AD/Entra sync
- Vendor/contract management, procurement/purchase orders, IT financial management
- Business continuity/disaster recovery tracking
- A general-purpose, configurable workflow/approval engine (a minimal single-step approval was built instead)
- Live reconciliation engine (a manual-upload version was built instead)
- Network auto-discovery
- AI/natural-language-query layer
- **Phone-width layout for the authenticated admin app** (tablet is the floor; phones use the public scan page)
- **Dark mode** (light-only, matching the approved design system)

If any of these become a real, demonstrated need later, they should be scoped as a deliberate, separate addition — not folded in casually.

## 9. Remaining gaps (true leftovers, not silent undecided items)

- **JWT refresh tokens** — access token only; 8h expiry. Noted since Phase 0 as future hardening
- **Seed resets demo data** when `SEED_ON_START=true` (compose default). Documented; set `false` after first boot to persist edits
- **Keyboard shortcuts** are strongest on assets/employees lists (`/` global search works everywhere)
- **No self-service admin bootstrap** — a migrate-only database has no login until an admin user exists (seed, or create via a one-off). First-run UI assumes someone can already authenticate

None of Prompt 6/8/9/12/13/14/15/16/17/18/19 product work is sitting as an undocumented gap.

## 10. Recommended next step

Operate the seeded demo, or stand up a migrate-only database with one admin user and walk the Welcome card. Out-of-scope enterprise ideas stay in `FUTURE_IDEAS.md`. Session hardening (refresh tokens) is the most useful *deferred* engineering item if this is deployed beyond a trusted LAN.
