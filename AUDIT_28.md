# Prompt 28 — Full codebase audit

Started 2026-09-13. Do not mark an item verified unless it was seen live or covered by a passing test that exercises the same path.

## Already covered (do not redo blindly)

From Prompts 25–27 (`PROGRESS.md`, `ENHANCEMENTS.md`, `DECISIONS.md`):

- Seed FK crash, EMP- search, mailer-not-throwing, seedWipeRisk banner
- IT_ADMIN permission alignment, Playwright/axe/lint fixes, Audit Log search drop
- Teams chat live-verified (two Socket.IO sessions); gateway `updateMany` for stale user
- Procurement manual correction + notes (narrow field allowlist)
- Self-service profile (phone/title) and requester ticket subject/description
- Prefills / My devices cards / Manager one-click approve / RoleRouteGuard profile
- Resend HTTPS mailer, bootstrap seed, keep-alive ping, Render HTTPS URLs

Honest leftovers carried in:

- No `RESEND_API_KEY` / IMAP credentials on Render — real inbox not claimed
- Production logged-in 5-role walkthrough was not completed in Prompt 27
- Full Playwright 80/80 as one suite after the last Profile-guard fix was not re-run

## Findings

| ID | Area | Severity | What | Action | Verified |
|---|---|---|---|---|---|
| A1 | Notes API | High | `GET /notes` allowed any signed-in user to read notes on any Asset / Accessory / Consumable / Location / Maintenance row. Managers could read every Asset Request’s notes. | Scope to the same visibility as the parent record (IT staff / assignee / team / requester). Ticket notes now also allow the employee’s manager. | e2e `audit-28-rbac` — employee 403 on unassigned asset notes, 200 after assign |
| A2 | Search | High | Manager search `OR` for title/name **overwrote** the visibility `OR`, so a Manager could find every requisition and every employee by name. Vendors were also returned to Managers who have no Vendors page. | Compose scope + search with `AND`. Vendors / POs stay Super Admin + IT Admin. Manager request search is team-scoped. | e2e — manager search misses secret PR and `Bala`; admin still finds the PR |
| A3 | Inventory API | High | `GET /accessories` and `GET /consumables` had no `@Roles`. Any Employee could list stock levels. | Restrict list/get to Super Admin / IT Admin / IT Support. | e2e — employee/manager 403; support 200 |
| A4 | Reports | High | Manager (and IT Support) could download estate-wide asset CSV (serials, cost), supplies, vendor spend, and scorecards. | Scope asset/employee/warranty/open-PR reports to the actor. 403 supplies + vendor reports for Manager; 403 vendor reports for IT Support. UI hides those cards. | e2e — manager asset CSV omits another team’s asset; supplies/spend 403 |
| A5 | Dashboard | Medium | `GET /dashboard/trends` had no `@Roles` — any Employee could read estate growth. | `@Roles` Super Admin / IT Admin / IT Support. | e2e — employee 403 |
| A6 | Chat uploads | Medium | `application/octet-stream` was an allowed MIME, so `.html` / `.jar` / `.svg` passed if not in the short blocklist. | Require a known extension; block html/htm/svg/jar/sh. | unit `chat-files.spec` |
| A7 | Imports | Medium | Import / reconciliation `FileInterceptor` had no size cap (service checked some paths, not all). | 10 MB limit on import-export, import-jobs, and reconciliation interceptors. | code + existing import tests |
| A8 | Ticket digest | Medium | `sendDailyDigests()` emailed every staff member on every run with no per-day marker. | De-dupe via a `general` notification titled `[digest YYYY-MM-DD]`. | e2e tickets — second `digest/run` in the same day returns `sent: 0` |
| A9 | Procurement lists | UX | Vendor / PR / PO / Contract lists treated a failed fetch as “no rows yet”. | Distinct error state + Retry, same pattern as Accessories. | code (live verify still pending) |
| A10 | Ticket comments | UX | Send had no loading/disabled guard — a double-click posted two replies. | `commentBusy` on the Send button. | code |
| A11 | Indexes | Perf | Daily warranty/audit jobs and digest de-dupe filtered unindexed `warranty_end`, `next_audit_due_at`, and `notifications.type`. | Migration `20260913200000_prompt28_indexes`. | schema + migration |

## Still sweeping

- Live 5-role walkthrough and production smoke after this chunk
- Chat / procurement deep-check (re-verify, not rebuild)
- Remaining list/form consistency, N+1, scheduled-job timezone
- Full suite + docs + push of later chunks
