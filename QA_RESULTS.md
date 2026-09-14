# QA results

Executed 2026-09-14 against local seeded app (`localhost:5173` + API `:3000`) unless noted. Pass = observed or green automated test.

## Summary

| Bucket | Result |
|--------|--------|
| Help (Prompt 29) | **Pass** — articles, nav, TOC, search, screenshots, glance cards |
| Axe (key screens + Help) | **Pass** after D1/D2 |
| Prompt 28 RBAC | Previously green `audit-28-rbac`; not re-run this sitting |
| Full backend e2e overnight | Not re-run (known `phase2` starvation on huge jobs) |
| Production mailbox / IMAP | **Not pass** — D3 |
| Production 5-role smoke | **Not pass** — D6 |

## Help (H)

| ID | Result | Evidence |
|----|--------|----------|
| H1 | Pass | Playwright: glance cards include Support Tickets, Team Chat, Vendor & Procurement, Roles, Tips |
| H2 | Pass | Nav expand Support tickets → For IT staff → Managing the IT queue; Team Chat section lists Team Chat |
| H3 | Pass | Getting Started TOC: Welcome, Demo logins, First steps |
| H4 | Pass | Search keyboard → Keyboard Shortcuts; demo logins; hidden gems; presence legend → Team Chat; 3-way match → Purchase orders |
| H5 | Pass | Every `helpArticles` id renders h1 |
| H6 | Pass | Declared screenshots `naturalWidth > 0` (regenerated light-theme PNGs under `frontend/public/docs/screenshots/`) |
| H7 | Pass | Markdown `[label](/help/…)` renders `<Link>`; underlined after D2 |
| H8 | Pass | Help home axe (first run); Help article axe after D2 |

## UI (U) — sampled live / screenshots / tests

| ID | Result | Notes |
|----|--------|--------|
| U1 | Pass | `dashboard.png` — KPI row, My work, light chrome |
| U2 | Pass | 1280×800 captures; header wraps Chat / bell / Help |
| U3 | Pass | `my-it.png` as Employee — Raise a ticket, Request a device, devices, open tickets |
| U4–U5 | Pass (prior + screenshots) | IT Support/Manager shells unchanged this pass |
| U6 | Pass (code + Prompt 28) | Procurement error+Retry already shipped |
| U8 | Pass | Copy chips visible on ticket/asset screenshots |
| U9 | Pass | `command-palette.png` via header button (role-filtered actions) |
| U10 | Pass | Documented `?` vs `Ctrl+/`; overlay component still present |
| U12 | Pass | Help landing Back to app |
| U13 | Pass | Axe dashboard, assets, raise-ticket, notes, Help home, chat, tickets list (after D1), Help article (after D2) |
| U14 | Pass | Skip-to-content first Tab on Help article |
| U15 | Pass | SLA chips now icon+text+contrast; procurement To chips check/clock/x |

## Functional / E2E / security — this sitting

Observed in captures (not a full mutation pass):

- Accessories **Cards** default with Issue + stock meters (`accessories.png`)
- Vendors Preferred flags (`vendors.png`)
- PR approval chain green To + Convert (`requisition-detail.png`)
- PO Mark sent / Record GRN / Amend / Manual correction (`po-detail.png`)
- Public scan: status, item, category, location, warranty — **no assignee/serial** (`scan-page.png`)
- Users screen Super Admin (`users.png`)
- Ticket canned + internal note + Assign to me + SLA (`ticket-detail.png`)

API RBAC from Prompt 28 remains the last green `audit-28-rbac` run. Not re-executed here.

E1–E5 full mutation journeys: **not re-executed end-to-end this sitting**. Chat two-session was verified in Prompt 26; Help documents current Chat UI from a live capture.

## Automated

```
npx playwright test e2e/help.spec.ts e2e/a11y.spec.ts
```

First run: Help **all pass**; a11y 6 pass / 2 fail (D1, D2).

After fix:

```
npx playwright test e2e/a11y.spec.ts --grep "tickets list|Help article"
→ 2 passed
```

## Production

Not marked pass. Keep-alive + HTTPS URLs unchanged. Mailbox D3 still open.
