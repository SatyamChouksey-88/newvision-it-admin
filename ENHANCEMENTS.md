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

## Prompt 20

| # | Finding | Resolution |
|---|---------|------------|
| B1/B3 | User management documented but missing | **Fixed** — Settings → Users (Super Admin) |
| B2 | Creating an employee created no login | **Fixed** — optional “Create a login” on add-employee |
| B5/B6 | Hardcoded Pune/Hyd/Bhopal copy | **Fixed** — location text from Location records / generic login copy |
| B8/B17 | Departments UI + unsafe deletes | **Fixed** — Settings → Departments; delete blocked when referenced (also categories) |
| B9 | Palette missing Reports/Audit/Help and `?` | **Fixed** — nav targets, `?` → Help, TCK-/AST- deep link |
| B10 | Public scan leaked name + serial | **Fixed** — status only |
| B11 | Accessories/consumables had no location | **Fixed** — `locationId` on stock (backend + types) |
| Email-in | Replies did nothing; footer said don’t reply | **Fixed** — thread headers, IMAP/webhook ingest, replyable footer |

## Prompt 23

| # | Finding / addition | Resolution |
|---|--------------------|------------|
| P23 | No vendor/PO module; records were not correctable after create | **Fixed** — full procurement module with edit/amend/void/resubmit + activity log |
| P23-UI | Duplicate Active on Employees; ticket CSV/PDF split from grid actions | **Fixed** — status only in Status column; CSV/PDF on the right toolbar |
| P23-UX | Tickets needed file attach plus Snipping Tool paste | **Fixed** — Paste screenshot / Ctrl+V |

## Prompt 22 remainder

| # | Finding / addition | Resolution |
|---|--------------------|------------|
| P22-kit | No named laptop+accessories checkout | **Fixed** — issue kits + employee runbook |
| P22-bulk | Bulk actions were status/transfer/retire only | **Fixed** — bulk assign |
| P22-audit | QR scan was read-only; no last-seen stamp | **Fixed** — Audit now on asset show |
| P22-loaner | Temporary assign had no expected return | **Fixed** — `expectedReturnAt` + My work |
| P22-queue | Ticket list had no J/K/I; `?` was Help only | **Fixed** — queue keys + Ctrl+/ overlay |
| P22-ui | Ticket search and CSV/PDF sat on two cramped rows | **Fixed** — one toolbar: search+Legend left, actions right |

## Prompt 24 — Team Chat

| # | Finding / addition | Resolution |
|---|--------------------|------------|
| P24 | Staff chat was a polling drawer with weak @name mentions | **Fixed** — Teams-style `/chat` with channels, DMs, threads, WS |
| P24-n | `chat_message` notifications had no deep link | **Fixed** — `Notification.link` + `chat_mention` / `chat_thread_reply` |
| P24-x | Beyond the brief | **Shipped** — message search, seen-by on small chats, `#helpdesk`/`#procurement`, PO/PR unfurl |
| P24-b | All messages stacked left; Word paste stole the thumbnail | **Fixed** — Teams Comfy left/right; clipboard prefers real files |

## Post-Prompt-25 hardening & enhancement pass (2026-09-12)

Full-repo audit against `PROJECT_HISTORY.md`, resolving its "Known Issues" table plus a fresh bug
sweep. Every item below was verified against the running app, a real Postgres DB, or the test
suites — not just read from code.

### Confirmed-real bugs found and fixed

| # | Finding | Resolution |
|---|---------|------------|
| H1 | `prisma/seed.ts` deletion order never cleared `chat_channels` / `chat_messages` (added in Prompt 24) before `user.deleteMany()` — reseeding **any** database that had chat activity crashed with a foreign-key violation (`P2003`) | **Fixed** — delete `chatMessage`/`chatChannel` (their children cascade) before `user` |
| H2 | Same reseed also crashed on `ticket_priority_targets` — the table was never cleared before `createMany()` re-inserted the four default priority targets, so a second `npm run seed` hit a unique-constraint violation on `priority` | **Fixed** — added `ticketPriorityTarget.deleteMany()` to the reset block |
| H3 | Employee search: the "does this look like a full employee code?" heuristic (`/^EMP[-A-Z0-9]+$/i`) matched a bare prefix like `"EMP-"`, forcing an **exact-match** lookup that matched nothing — searching just `EMP-` (or any partial code) returned zero results instead of a prefix match | **Fixed** — heuristic now requires `EMP-` + digits (`/^EMP-\d+$/i`); a bare prefix falls through to the existing `contains` search. Regression tests added in `employees-offboard.e2e-spec.ts` |
| H4 | `backend/test/assets.e2e-spec.ts` referenced undefined identifiers `laptop`/`pune` (should have been `ids.categoryLap`/`ids.locationPune`) in 6 test cases — the file didn't even **compile**, so the whole e2e suite was silently broken | **Fixed** — corrected to the seeded `ids` fixture; confirms `PROJECT_HISTORY.md`'s "suite-wide green not re-confirmed" was hiding a real break |
| H5 | `MailerService.send()` had no try/catch — an unreachable SMTP host (Render Free blocking 587/465, or any transient failure) would throw **out of the ticket/requisition/contract/password-reset mutation that triggered it**, failing the whole request even though the underlying record had already saved | **Fixed** — `send()` now catches transport errors, logs them loudly, and tracks the last failure instead of propagating |
| H6 | The dashboard's `SEED_ON_START` warning banner was unconditional and inaccurate: it says "restarting will wipe demo data," but `prisma/seed.ts` already skips reseeding via `SEED_IF_EMPTY` (which `render.yaml` sets alongside `SEED_ON_START`) — so production was never actually at risk, but every admin saw a permanent false alarm | **Fixed** — `/dashboard/setup` now returns `seedWipeRisk` (true only when `SEED_ON_START=true` **and** `SEED_IF_EMPTY` is not), and the UI banner text was corrected |
| H7 | Backend `IT_ADMIN` permission list omitted `request:approve` / `issue:report` / `asset:request` even though `@Roles()` on the relevant controllers already grants IT_ADMIN those actions — the frontend's own mirrored list (and the informational "Your permissions" panel under Settings → Account) disagreed with the backend | **Fixed** — added the three keys to backend `IT_ADMIN`; matrices now agree. Confirmed via `curl` against the live API and a new `permissions.spec.ts` case |
| H8 | Frontend CI gate (`npm run lint`) was **red on `main`**: a stale `biome-ignore` comment on the wrong line in `tickets/list.tsx`, a missing one on `tickets/create.tsx`, and an `aria-label` on a `<span>` with no ARIA-naming-capable role in `AppSider.tsx` | **Fixed** — moved/added the ignore comments to the actual flagged line; gave the sider badge dot `role="status"` |
| H9 | Dashboard "My work" section header count (`.nv-dash-title__count`, `#64748b` on `#f4f8fc`) failed WCAG AA color contrast (4.45:1, axe-core `color-contrast`, serious) | **Fixed** — darkened to `#475569` |

### Test-suite fixes (stale/fragile tests, not app bugs)

Six Playwright specs were failing for reasons unrelated to the app: stale copy assertions
(`prompt17.spec.ts` expected a pre-Help-rebuild heading; `audit-fixes.spec.ts` expected a generic
DataGrid placeholder a page had since customized), a UI restyle the tests never caught up with
(`assets.spec.ts`/`governance.spec.ts` used a placeholder-text selector for the `Status` filter,
which became a `ChipSelect` chip with a shared "All" placeholder — fixed via a new
`selectByLabel()` helper targeting the combobox's `aria-label` instead), a genuine Playwright API
gap (`chat.spec.ts`'s `Locator.dispatchEvent('paste', { clipboardData })` doesn't wire
`clipboardData` onto the event the way it special-cases `dataTransfer` for drag events — rebuilt
via `locator.evaluate()` constructing a real `ClipboardEvent` in-page), an AntD `Modal.confirm`
DOM quirk (duplicates its title into a hidden node for `aria-labelledby` plus the visible
`.ant-modal-confirm-title` — `assets.spec.ts` now targets the latter specifically), and a
non-deterministic test fixture pick (`employee-history.spec.ts` blindly clicked "whatever
employee sorts first" for an `EMP-` search, which deterministically lands on a demo account with
no history under the app's default `id desc` sort — rewritten to fetch a genuinely-assigned
employee via the API first).

### Enhancements

| # | What | Why |
|---|------|-----|
| E1 | Extended `enableQueueKeys` (J/K row nav, Enter-to-open) to the four procurement lists — Requisitions, Purchase Orders, Contracts, Vendors — matching the pattern already used on Tickets | Closes the "keyboard shortcuts inconsistently applied" item; skipped Accessories/Consumables/Requests/Maintenance since those use an expand-in-place row pattern where "Enter to open a show page" doesn't apply cleanly — extending it there would need a different interaction, not a drop-in |
| E2 | Committed the real employee-feedback Word template under `docs/NewVision_Employee_Feedback_Form.docx`; removed the accidental default-named `New Microsoft Word Document.docx` (its content was leftover UI-request notes, not a deliverable) | Closes the "leftover uncommitted binary file" item |

### Investigated, found already correct (no change needed)

- **SMTP on Render Free**: confirmed the app never silently swallows a send failure without a
  trace — it now logs `[email:failed]` and surfaces `mailFailing` on the dashboard (H5/H6 above).
  A real fix for outbound mail itself (a provider whose ports aren't blocked) is an operational
  change, not a code one — documented in `render.yaml`'s comments and here.
- **Email-in (IMAP)**: still unproven without a real mailbox, as documented; this is an
  operational/credentials gap, not something fixable from within this pass.

