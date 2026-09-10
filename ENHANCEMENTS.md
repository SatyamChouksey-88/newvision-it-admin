# ENHANCEMENTS.md — Prompt 8 self-audit

Audit date: 2026-09-10. Each item lists the finding and resolution status.

## Security / permissions

| # | Finding | Resolution |
|---|---------|------------|
| S1 | `GET /employees/:id` had no RBAC — any authenticated user could read any employee record | **Fixed** — `get()` now calls `assertCanViewEmployee` |
| S2 | `DELETE /employees/:id` hard-deleted records, destroying assignment/checkout/issue history | **Fixed** — delete blocked when employee has history; offboarding is the supported path |
| S3 | Employee list endpoint exposed all employees to every role without scoping | **Fixed** — managers see direct reports only; employees see self |

## Correctness

| # | Finding | Resolution |
|---|---------|------------|
| C1 | No offboarding flow — assets/accessories left assigned when employee departs | **Fixed** — `POST /employees/:id/offboard` returns assets, checks in accessories, deactivates account |
| C2 | No merged employee History timeline across assignments, transfers, accessories, consumables, requests | **Fixed** — `GET /employees/:id/history` + History tab on profile |
| C3 | Dashboard KPI cards were not clickable despite looking like summary metrics | **Fixed** — cards link to filtered Assets list |
| C4 | Accessory check-in during offboard could fail silently if checkout IDs unknown | **Fixed** — offboard loads all open checkouts in transaction |

## Consistency (DataGrid, copy, export)

| # | Finding | Resolution |
|---|---------|------------|
| U1 | Consumables, Requests, Maintenance, Locations, Import Jobs still used plain Ant Table | **Fixed** — migrated to `DataGrid` |
| U2 | CopyButton missing on asset detail, employee profile, maintenance asset codes | **Fixed** |
| U3 | Employee profile tables lacked DataGrid features | **Fixed** — assigned assets table uses DataGrid |
| U4 | Scope-aware export only on Assets list | **Fixed** — employees export via server endpoint where applicable |

## Performance

| # | Finding | Resolution |
|---|---------|------------|
| P1 | `Employee.email` and `Employee.isActive` used in filters without indexes | **Fixed** — Prisma indexes added |
| P2 | Employee history merged in application layer (multiple queries) | **Accepted** — bounded `take` limits; single endpoint avoids N+1 on profile page |

## UI/UX

| # | Finding | Resolution |
|---|---------|------------|
| X1 | Employee profile had no tabs — history buried / missing | **Fixed** — Tabs: Overview, History, Offboard (IT Admin) |
| X2 | Inactive employees not visually distinguished in list | **Fixed** — inactive badge in employee list |
| X3 | Help articles referenced screenshot paths with no files committed | **Fixed** — screenshots captured and committed under `docs/screenshots/` |

## Tests

| # | Finding | Resolution |
|---|---------|------------|
| T1 | No tests for offboard or employee history | **Fixed** — backend e2e + Playwright profile/history spec |
| T2 | Dashboard drill-down not covered | **Fixed** — Playwright dashboard drill-down assertion |

## Documentation drift

| # | Finding | Resolution |
|---|---------|------------|
| D1 | Docs claimed full DataGrid everywhere; 5 tables still plain | **Fixed** in code + docs updated |
| D2 | Docs implied offboarding/history existed | **Fixed** — implemented and documented |
| D3 | Test counts in README stale | **Fixed** — re-counted after new tests |

## Mid-fix additions (found while implementing)

| # | Finding | Resolution |
|---|---------|------------|
| M1 | `MetricCard` sparkline area not linked when card body clicked | **Fixed** — entire card is a link except sparkline chart |
| M2 | Offboard allowed on already-inactive employee | **Fixed** — returns 400 with clear message |

## Prompt 12 follow-up audit (2026-09-10)

| # | Finding | Resolution |
|---|---------|------------|
| A1 | Webhooks, reconciliation findings, import column-map/errors still used plain `Table` | **Fixed** — `DataGrid` |
| A2 | Accessory open-checkouts `take: 20`, profile issues `take: 50`, request history `take: 100`, supplies report issues `take: 200` | **Raised** to 200/500/500/2000 |
| A3 | Import jobs list fetched 50 rows with no paging affordance | **Raised** fetch window to 200; list already paginates in the grid |
| A4 | Warranty colour used 30-day amber, not the mockup 14/45 split | **Fixed** — ≤14 red, ≤45 amber |
| A5 | Location chart was a single series | **Enhanced** — `GET /dashboard/by-location` now returns `byStatus` for a stacked bar |
| A6 | Login was a single-column AuthPage | **Rebuilt** two-column + estate panel |
| A7 | Accessories were table-only | **Card grid default** + table toggle |
| A8 | Employee profile tabs were Overview/History | **Assigned / Supplies / History / Requests** |

## Prompt 13 follow-up (2026-09-10)

| # | Finding | Resolution |
|---|---------|------------|
| P13-1 | `PROJECT_STATUS.md` still described the product as of Prompt 4 | **Rewritten** against live code |
| P13-2 | Mobile/responsive was an unnamed gap | **Tablet floor implemented**; phone-width admin declined in `DECISIONS.md` |
| P13-3 | Dark mode undecided | **Declined**; light forced so OS dark cannot partially invert UI |
| P13-4 | Empty database had only generic empty states | **Welcome to NewVision** card when estate counts are all zero |
| P13-5 | Welcome linked to categories/employees with no create UI | **Settings → Categories** + **Add employee** modal |

## Prompts 14–16

| # | Finding | Resolution |
|---|---------|------------|
| A1 | Growth (12 months) chart pinned at 0, y-axis 0–1 | **Fixed** — UTC month keys + frontend `count` binding; seed `createdAt` from purchase date |
| A2 | Assets select-all header showed wrapped “Select all assets” text | **Fixed** — checkbox + `aria-label`; DataGrid wraps string titles |
| A3 | MANAGE label rainbow; logo placeholders | **Fixed** — Menu.ItemGroup muted color; `/brand/` assets on sider, login, Help, favicon |
| T1 | No general IT helpdesk (only asset maintenance + asset requests) | **Added** — Support Tickets module (Spiceworks-simple) |
| T2 | IT email notification flood | **Added** — Immediate vs Daily digest (email only; in-app always on) |
| T3 | No escape hatch for typos / historical backfill | **Added** — Notes + Manual correction with mandatory reason |

## Prompt 17

| # | Finding | Resolution |
|---|---------|------------|
| B1 | Single ~3.6 MB JS chunk; Vite size warning on every build | **Fixed** — `React.lazy` routes + `manualChunks`; Ant Design ~1.2 MB is the one irreducible vendor chunk |
| B2 | “Growth” chart plotted per-month additions, not estate size | **Fixed** — cumulative running total + labelled “Added this month” |
| B3 | Docs claimed 47 Playwright tests | **Fixed** — re-counted: 58 unit + 84 integration + 55 Playwright |
| B4 | Helpdesk/notes skipped some empty/loading/a11y states | **Fixed** — empty copy, skeletons, axe on tickets + notes |

## Prompt 18

| # | Finding | Resolution |
|---|---------|------------|
| E1 | Ticket lifecycle emails were plain text and creation sent none to the requester | **Fixed** — branded HTML templates for created/assigned/unassigned/comment/status-change/resolved/digest; requester now gets a creation confirmation |
| E2 | No test coverage confirmed which email fires for which event | **Fixed** — `ticket-emails.e2e-spec.ts` spies `MailerService.send` and asserts subject/template per event |

## Prompt 19

| # | Finding | Resolution |
|---|---------|------------|
| V1 | A "futuristic" visual pass (glow/glass/mesh/bento) had drifted from the approved reference mockup | **Reverted** — restored the reference's plain equal-size grids, opaque surfaces, and existing hover shadows; kept the command palette and "Updated Ns ago" copy as genuine, non-visual improvements |
| V2 | AntD `color="green"` preset tag failed axe-core color-contrast (3.37:1) on asset notes and the command palette | **Fixed** — swapped to the project's existing safe green/blue/purple/orange pairs |
| V3 | Mockup's floating "?" help-launcher FAB has no equivalent in the app | **Declined** — header's labelled Help button covers the same entry point with better a11y; logged rather than silently diverging |


