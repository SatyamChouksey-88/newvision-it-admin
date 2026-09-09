# NewVision — Project Status & Gap Audit

This document consolidates everything decided across the research, Prompt 1 (build), Prompt 2 (review/fix/enhance), and Prompt 3 (UI-only pass), so there's one place that says what's covered, what's deliberately excluded, and what's still missing.

## 1. What's covered (Prompt 1 — core build)

- Auth + 5-role RBAC (Super Admin, IT Admin, IT Support, Manager, Employee)
- Asset CRUD, categories, locations, departments, employees
- Assign / Transfer / Retire actions with an enforced backend lifecycle state machine
- Global search across asset code, serial, employee, model, location
- Dashboard with metric cards (total/assigned/available/repair/warranty-expiring) and a location filter
- CSV/Excel import and export for assets and employees
- Append-only audit log with a restricted viewer
- Maintenance/repair ticket module with vendor/cost/completion tracking
- Warranty expiry alerts (30/60/90-day scheduled email job)
- Reports module (asset/employee/location/warranty), exportable to CSV/PDF
- Employee profile page showing all assigned assets
- Background-job bulk import with dry-run, duplicate detection, rollback (Phase 3)
- Basic HR-export reconciliation (manual upload, Phase 3)
- QR code generation + mobile scan-to-view page, REST API + webhooks (Phase 4, optional)
- Tech stack fixed: React + Refine + Ant Design, NestJS + PostgreSQL + Prisma, Docker, CI

## 2. What's covered (Prompt 2 — review, fixes, accessories, and missing pieces)

- Full code review checklist against Phase 1–4 (lifecycle enforcement, audit logging, permission checks, N+1 queries, error handling)
- Resolved the Employee-request/Manager-approve contradiction with a minimal single-step approval (not a workflow engine)
- **Accessories & Consumables module** — chargers, mice, headsets, cables etc. tracked separately from serialized assets, with checkout/check-in for accessories and quantity-based issuing + low-stock alerts for consumables
- Pagination and column sorting/filtering on every data table
- Row-level expand-to-detail on tables
- Copy-to-clipboard on IDs/codes (first pass — refined further in Prompt 3)
- Scope-aware export (respects current filters, names the file accordingly)
- Field-level status + reason for anything that can fail (import rows, rejected requests)
- Import run history (started/completed, rows processed/created/updated/failed, duration)
- In-app notifications (bell icon, tied to the previously-unused `notifications` table)
- Loading/empty states on every list screen
- Accessibility test pass (axe-core in Playwright)
- Official branding: logo, compact logo, favicon URLs specified for use

## 3. What's covered (Prompt 3 — premium UI-only pass)

> **Note:** Prompt 3 is scoped and specified here; implementation may be partial until that pass is completed in code.

- Fixed the broken/missing logo (download and store locally, verify it renders)
- Fixed the core light-gray-on-white text readability problem with a concrete color hierarchy (`#1F1F1F` primary → `#BFBFBF` disabled-only)
- Introduced a single accent color (used only on interactive/active/focused elements) plus a proper two-tier depth/shadow system
- Refined copy-to-clipboard into one reusable, accessible component with on-button feedback
- Added a persistent Help launcher with a searchable panel, per-feature articles with annotated screenshots, and contextual inline help on complex fields
- A final consistency sweep across every screen (colors, spacing, radius, status badges, depth)

## 4. What's explicitly and deliberately excluded (by design, not by oversight)

These came up in the original 56-section research document but were intentionally kept out because they belong to full enterprise ITSM/CMDB suites (ServiceNow, GLPI-at-scale) and don't fit a ~1,250-asset, 3-location internal tool:

- CMDB / configuration-item relationship mapping and dependency graphs
- IT service catalog, SLA tracking, service lifecycle management
- Ticketing/ITSM platform, change & release management
- IT governance, security/vulnerability/patch management modules
- IAM/Joiner-Mover-Leaver automation, live AD/Entra sync
- Vendor/contract management, procurement/purchase orders, IT financial management
- Business continuity/disaster recovery tracking
- A general-purpose, configurable workflow/approval engine (a minimal single-step approval was built instead, where genuinely needed)
- Live reconciliation engine (a manual-upload version was built instead)
- Network auto-discovery
- AI/natural-language-query layer

If any of these become a real, demonstrated need later, they should be scoped as a deliberate, separate addition — not folded in casually.

## 5. Gaps — what's NOT yet covered by any prompt so far

- ~~**The dashboard has no real charts.**~~ **Addressed in Prompt 4** — status donut, per-location bar chart, 12-month trend line, sparkline on Total KPI.
- ~~**The import feature has no rich visual summary.**~~ **Addressed in Prompt 4** — donut for created/updated/failed/duplicates + error category bar chart on completed jobs.
- ~~**No dedicated color strategy for data visualization exists yet.**~~ **Addressed in Prompt 4** — `frontend/src/chartColors.ts` (categorical palette separate from UI accent).
- **Mobile/responsive behavior** hasn't been explicitly specified for the main dashboard/tables beyond the QR scan-to-view page (Phase 4), which was scoped as mobile-friendly on its own.
- **Dark mode** has not been discussed or scoped anywhere — not necessarily needed, but worth naming as an explicit non-goal rather than a silent gap if that's the decision.
- **Onboarding for a brand-new admin** (first-login experience, empty-database state beyond a generic empty state) hasn't been specifically designed.

## 6. Recommended next step

Address the dashboard/import visualization gap directly — this is the one concrete, well-defined thing from Section 5 that materially improves the "feel" of the product without reopening scope questions. That's what **Prompt 4** covers: real charts on the dashboard using a proper data-visualization color palette, and a visual, chart-based summary after any Excel/CSV import — while keeping the UI chrome itself exactly as restrained as Prompt 3 established (the added color lives in the data, not in buttons/backgrounds/text).
