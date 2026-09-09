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
