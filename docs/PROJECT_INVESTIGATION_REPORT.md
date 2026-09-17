# NewVision — Project Investigation Report (updated)

**Date:** 2026-09-18 (post gap-fix pass)  
**Scope:** Local workspace after investigation remediation commits (not pushed to remote).

---

## Test runs (verified this session)

| Suite | Result |
|-------|--------|
| Backend unit (`cd backend && npm test`) | **153/153**, exit 0 |
| Backend e2e (`NODE_OPTIONS=--max-old-space-size=4096 npm run test:e2e`) | **206/206**, 37 suites, ~807s, exit 0 |
| Playwright (`cd frontend && npx playwright test`, API :3000) | **102/102**, ~8.9m, exit 0 |
| Import parse benchmark (`node backend/scripts/benchmark-import.mjs`) | 100,000 rows, **125 ms** parse (this run) |
| API 2h soak (`SOAK_MS=7200000 node backend/scripts/api-soak.mjs`) | **Not run** — script added; execute locally for Windows libuv sign-off |

---

## Summary table (post-fix)

| Section | Done | Partial | Missing | Broken | Can't verify |
|---------|------|---------|---------|--------|--------------|
| A Core ITAM | 13 | 0 | 0 | 0 | 0 |
| B Helpdesk | 5 | 0 | 0 | 0 | 0 |
| C Procurement | 6 | 0 | 0 | 0 | 0 |
| D Chat | 4 | 0 | 0 | 0 | 0 |
| E UI/UX | 2 | 1 | 0 | 0 | 0 |
| F Hygiene | 3 | 0 | 0 | 0 | 0 |
| G Phases 1–9 | 17 | 0 | 0 | 0 | 1 |
| H Phases 10–14 | 18 | 1 | 0 | 0 | 0 |
| I Infra | 2 | 1 | 0 | 0 | 1 |

---

## Key fixes since 2026-09-17 report

- **E2E seed:** `seedCore` serialized + full-schema truncate + role upsert; `fanOutToIt` no longer queries outside an open transaction.
- **Playwright:** `global-setup` requires healthy API; local docker `NODE_ENV=development` skips login rate-limit; canned-macro test uses stable API comment path.
- **CI:** Node **24** matches `engines >=24.16.0`.
- **Phase 11/12 gaps:** `ScheduledReportsService`, `AuditCycleReminderService`, `migration-dry-run.ts`.
- **Docs:** `TECHNICAL_REFERENCE.md` counts corrected; redirect stubs for checklist/history; `DECISIONS.md` + `docs/archive/README.md`; deploy-target note (Render vs VPS undecided).

---

## Blocked on Satyam (unchanged)

- Real Entra app registration + secrets + Conditional Access testing  
- Real helpdesk mailbox (IMAP/SMTP/Graph)  
- `INITIAL_SUPER_ADMIN_EMAILS`, `SENTRY_DSN`, depreciation policy sign-off  
- **Render vs Hostinger VPS** decision + production env/TLS  
- `git push` when ready  
- Optional: **2h API soak** on your machine (`backend/scripts/api-soak.mjs`)

---

## Evidence index

- E2E helpers: `backend/test/helpers.ts`  
- Custom role API: `backend/src/common/guards/roles.guard.ts`, `backend/test/custom-role-rbac.e2e-spec.ts`  
- Scheduled reports: `backend/src/reports/scheduled-reports.service.ts`  
- Audit reminders: `backend/src/audit-cycles/audit-cycle-reminder.service.ts`  
- Dry-run: `backend/scripts/migration-dry-run.ts`, `import-export.service.ts` `dryRunAssets` / `dryRunEmployees`  
- Phase log: `PHASE_LOG.md` (gap-fix section 2026-09-18)
