# NewVision — Resume & Ship (paste into a fresh Agent session)

Use this when work was **paused mid-upgrade** (cost/token stop), not because of a hard failure. Goal: **audit → finish → validate → commit → push → deploy** on `main`, without rewriting the product.

**Companion docs (read before coding):**

| File | Purpose |
|------|---------|
| [`CURSOR_PROMPT_FOR_NEWVISION.md`](./CURSOR_PROMPT_FOR_NEWVISION.md) | Non-goals, “already built”, slice workflow |
| [`DECISIONS.md`](./DECISIONS.md) | Architecture judgments (accessories ≠ assets, tenancy, RBAC) |
| [`FUTURE_IDEAS.md`](./FUTURE_IDEAS.md) | Explicit out-of-scope |
| [`FEATURE_UPGRADE_RESEARCH.md`](./FEATURE_UPGRADE_RESEARCH.md) | P0/P1 UX gaps (joining date, My kit, sticky, phone) |
| [`NEWVISION_RESEARCH_PACK.md`](./NEWVISION_RESEARCH_PACK.md) | Security, email, GST, GTM leftovers |
| [`PROGRESS.md`](./PROGRESS.md), [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) | Phase status |
| [`README.md`](./README.md) | Run, test, demo accounts |

---

## Hard constraints (every phase)

- **Stack:** Refine + Ant Design + NestJS + Prisma + PostgreSQL (multi-tenant `tenantId`). **Do not** swap frameworks or add a second DataGrid / design system.
- **Do not add:** dark mode, PWA, SEO, AI, i18n, merge Accessories into Assets.
- **Reuse:** `DataGrid`, `EmptyState`, `CommandPalette`, `httpClient`, `RolesGuard`, `access.ts`.
- **API security:** scope on the server (`@Roles`, employee/manager summaries); never UI-only hiding.
- **Work sequentially** as one agent (no parallel sub-agents editing the same files).
- **Ask first** before: destructive DB without migration, changing public/auth contracts, force-push, deleting tenant data, or picking a new host if unclear.

---

## Known checkpoint (update this section when you pause again)

*Last updated: 2026-09-14 — adjust after your session.*

| Area | Status |
|------|--------|
| Git | `main` tracks `origin/main`; WIP ready to commit (prompts ~32–38) after lint/typecheck fixes |
| Employee **My kit / My IT** accessory checkouts | `GET /dashboard/my-summary` returns `accessories[]`; Employee Home + `/assets` cards; `MyKitAccessoryCard.tsx`; seed checkout for demo employee |
| Tests (targeted) | `prompt32/37/38` e2e **pass** in isolation; full backend e2e suite can be flaky on Windows (memory); rely on GitHub Actions for full matrix |
| Migrations | Duplicate folders removed (`prompt33_loops`, `catchup_overdue_mailed` merged into `prompt32_loops` / `prompt36_maker_checker`) |
| Browser verify | Prefer `frontend/e2e/helpers.ts` → `loginViaApi` / Playwright; UI password fill may be blocked in some automation environments |
| Playwright | Requires Chromium installed locally; CI runs full suite in GitHub Actions |
| Deploy | [`render.yaml`](./render.yaml) — API + static frontend; region Singapore demo; `GET /api/health` |

**Likely follow-ups (list, don’t scope-creep in one ship):** Help copy stale vs bulk assign, `dateJoined` null on some seed employees, pg pool deprecation warnings under heavy e2e on Windows.

---

## Pasteable agent prompt (full Resume & Ship)

```text
You are resuming NewVision (Refine+AntD / Nest+Prisma ITAM, multi-tenant).

Read first: RESUME_AND_SHIP_PROMPT.md (checkpoint table), CURSOR_PROMPT_FOR_NEWVISION.md,
DECISIONS.md, FUTURE_IDEAS.md, FEATURE_UPGRADE_RESEARCH.md, README.md.

Do not rewrite the app. No dark mode, PWA, SEO, AI, i18n, new design system, second DataGrid,
or merging Accessories into Assets. Reuse DataGrid, EmptyState, CommandPalette, httpClient, RolesGuard.

## Phase 1 — Audit (no code yet)
1. Explore structure, README, PROGRESS/PROJECT_STATUS, git status, git log, and uncommitted diff scope.
2. Run: backend lint/typecheck/tests; frontend lint/typecheck; note exact failures.
   - Backend e2e: `cd backend && npm run test:e2e` (or targeted `npx jest --config ./test/jest-e2e.js --runInBand test/<file>.e2e-spec.ts`).
   - Frontend e2e: `cd frontend && npx playwright test` (subset if needed).
   - Docker: `docker compose up --build` if local services aren’t running.
3. Write a short audit: working / partial / broken / missing vs docs and checkpoint table in RESUME_AND_SHIP_PROMPT.md.

## Phase 2 — Plan
Ordered tasks: blocking (migrations, compile, failing CI) → incomplete WIP features → polish.
Infer patterns from existing code. Ask me only for irreversible or security/deployment choices not already in render.yaml / DECISIONS.md.

## Phase 3 — Implement
Finish WIP end-to-end (no stubs). Config via env/docker-compose/render.yaml — no hardcoded secrets.
Match existing style; scoped diffs; add/update tests where the repo already tests similar behavior.

## Phase 4 — Validate
- `backend`: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e` (or CI-equivalent subset if timeboxed).
- `frontend`: `npm run lint`, `npm run typecheck`, Playwright for touched flows.
- Manually trace core flows: login as IT Admin + Employee; My IT / My kit if that slice is in scope; one IT list (Assets) still serialized-only.
Do not ship with known red tests on touched areas.

## Phase 5 — Commit & push
- Scan diff for `.env`, keys, artifacts, `node_modules`.
- Commit in **logical chunks** with clear messages (not one giant commit unless the tree is one feature).
- Branch: usually `main`; push to GitHub without force-push unless I explicitly asked.
- Optional: open PR if that’s the team habit; otherwise push `main` if that’s what this repo uses.

## Phase 6 — Make live
- “Live” = Render blueprint in render.yaml (API + frontend) + GitHub Actions CI green.
- Trigger deploy via Render (or push if auto-deploy). Verify `GET /api/health` and the frontend URL loads.
- Do not invent a new host. If deploy creds/env vars are missing, stop and list what I must set (BOOTSTRAP_*, DATABASE_URL, JWT_SECRET, etc. per backend/.env.example).

## Phase 7 — Report
Summarize: audit findings, what you finished, key files, test/lint status, commits + push, deploy URL/status, deferred items.

If blocked mid-way on something irreversible, stop and ask.
```

---

## Commands cheat sheet

| Task | Command |
|------|---------|
| Local stack | `docker compose up --build` → :5173 UI, :3000/api |
| Demo password | `Password123!` (see README) |
| Backend unit | `cd backend && npm test` |
| Backend e2e | `cd backend && npm run test:e2e` |
| Backend migrate (dev) | `cd backend && npx prisma migrate deploy` |
| Frontend dev | `cd frontend && npm run dev` |
| Playwright | `cd frontend && npx playwright test` |
| CI mirror | `.github/workflows/ci.yml` |

---

## Shorter variant (one feature slice only)

If you are **not** shipping everything—only finishing one slice before commit—use [`CURSOR_PROMPT_FOR_NEWVISION.md` §6](./CURSOR_PROMPT_FOR_NEWVISION.md) instead:

```text
This session implements ONLY: <one slice from FEATURE_UPGRADE_RESEARCH.md>.

Add/adjust tests. Verify in browser if UI.
Commit in logical chunks when Phase 5 applies; otherwise ask before commit.
```

---

## One line

**Resume & Ship = generic phased delivery + NewVision guardrails + checkpoint table + Render/CI reality—not a 60-section SaaS rewrite.**
