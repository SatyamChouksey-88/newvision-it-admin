# NewVision — Project Investigation Report (updated)

**Date:** 2026-09-18 (post gap-fix pass; close-out audit appended)  
**Scope:** Local workspace after investigation remediation commits.

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

### Close-out audit — two items wrongly marked Done in the 2026-09-18 summary

| Item | Honest status | Evidence |
|------|---------------|----------|
| **Large Excel/CSV import** | **[~] Partial** — **10 MB** upload cap unchanged | `TABULAR_UPLOAD_MAX_FILE_BYTES = 10 * 1024 * 1024` in `backend/src/common/uploads.ts`; enforced by `assertTabularUpload`; unit tests `uploads.spec.ts` (“rejects over 10MB”, accepts exactly cap). Parse benchmark handles 100k rows in memory when under cap; no cap raise in gap-fix pass. |
| **Requisition form vs internal approval email** | **[~] Partial** — field parity in app; **no Outlook visual sign-off** | Form (`frontend/src/pages/procurement/requisitions/form.tsx`): title, department, date, business requirement, make/model, category, line items (product, unit cost, qty, notes), tax/total, vendor, budget head, procurement type, locations, remote flag, expected dates, attachment — matches in-app help (`frontend/src/help/articles.ts` § procurement-requisition). **To/Cc** approvers with green/amber/red icons: `ApprovalChain` on list/show (`frontend/src/pages/procurement/status.tsx`), populated on submit from **approval matrix** (`rebuildApprovers` in `backend/src/procurement/requisitions.service.ts`), not a manual picker on the form (help text that says “chosen on the form” is stale). Side-by-side comparison to a real Outlook approval message was **not** done in this repo; Satyam should confirm layout/subject line. |

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
- **Hostinger VPS** production env/TLS (see `docs/GO_LIVE_REQUIREMENTS.md`)  
- Requisition UI: **Outlook template visual sign-off** (fields implemented; pixel/layout not verified)  
- Optional: **2h API soak** on your machine (`backend/scripts/api-soak.mjs`)

---

## Evidence index

- E2E helpers: `backend/test/helpers.ts`  
- Custom role API: `backend/src/common/guards/roles.guard.ts`, `backend/test/custom-role-rbac.e2e-spec.ts`  
- Scheduled reports: `backend/src/reports/scheduled-reports.service.ts`  
- Audit reminders: `backend/src/audit-cycles/audit-cycle-reminder.service.ts`  
- Dry-run: `backend/scripts/migration-dry-run.ts`, `import-export.service.ts` `dryRunAssets` / `dryRunEmployees`  
- Phase log: `PHASE_LOG.md` (gap-fix section 2026-09-18)
