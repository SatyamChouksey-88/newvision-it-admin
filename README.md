# NewVision Asset Manager

[![CI](https://github.com/SatyamChouksey-88/newvision-it-admin/actions/workflows/ci.yml/badge.svg)](https://github.com/SatyamChouksey-88/newvision-it-admin/actions/workflows/ci.yml)

NewVision Asset Manager is an internal IT operations web app for **NewVision Softcom** (and similar single-tenant deployments). It gives IT, managers, and employees one place to track hardware and software assets, run helpdesk tickets, handle procurement, and coordinate day-to-day IT work—with strict tenant isolation when multiple companies share one deployment.

**Audience:** IT administrators and support staff (full modules), managers (team-scoped people, assets, tickets, requisitions), employees (self-service tickets, asset requests, My IT).

## My QA role in this project

I own test strategy for this full-stack app as the automation engineer on the team:

| Area | What’s covered |
|---|---|
| **Strategy** | Risk-based E2E on critical employee / IT / manager flows; API/integration tests in the NestJS backend; accessibility gates with axe |
| **Playwright E2E** | `frontend/e2e/` — **27** spec files, **104** `test()` cases (auth, assets, tickets, requests, reports, scan, search, responsive/join-kit, etc.) |
| **Accessibility** | `frontend/e2e/a11y.spec.ts` — **14** axe checks (`@axe-core/playwright`) for login, dashboard, assets, tickets, help, chat, role homes |
| **Backend** | Jest unit + Nest integration e2e (`npm test`, `npm run test:e2e`) against PostgreSQL |
| **CI gates** | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — Backend (lint · typecheck · unit · integration) and Frontend (lint · typecheck · build) must pass; Playwright e2e runs after those jobs succeed |

> **CI status note (2026-09-24):** the latest `main` CI run is **red**. Failures are in frontend lint and backend `tsc` (Jest globals like `describe`/`it` not typed in some `*.spec.ts` files under the main tsconfig) — not a single flaky Playwright selector. Playwright e2e was skipped because upstream jobs failed. Fixing that typecheck/lint debt is tracked separately from this portfolio README pass.

## Tech stack

| Layer | Stack |
|-------|--------|
| Frontend | React 19, TypeScript, Refine, Ant Design, Vite |
| Backend | NestJS, Prisma, PostgreSQL 16 |
| Auth | JWT + refresh cookie, five system roles, optional custom roles, optional Microsoft Entra ID (OIDC) |
| Local ops | Docker Compose; production target Hostinger VPS (see go-live docs) |

## Features

- **ITAM** — Assets, accessories, consumables, locations, warranties, QR scan audit, depreciation on reports, import/export (CSV/XLSX).
- **Helpdesk** — Tickets, SLA escalation, email-in ingest, canned responses, @mentions, optional chat notifications.
- **Procurement** — Vendors, purchase requisitions and approval chain, POs, GRN, invoices, contracts.
- **People** — Employees, onboarding/offboarding checklists, asset requests, client/VDI fields where enabled.
- **Collaboration** — Team chat (channels and DMs) for IT operations.
- **Governance** — RBAC (including custom roles), audit log, physical audit cycles, scheduled reports and reminders.

## Quick start (Docker)

Requires Docker Desktop.

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000/api |
| Swagger | http://localhost:3000/api/docs |

On first boot the backend runs migrations and seeds demo data when `SEED_ON_START=true` (default in `docker-compose.yml`). Set `SEED_ON_START: "false"` after the first run to keep local data across restarts.

### Demo accounts

Password for all: **`Password123!`**

| Role | Email |
|------|--------|
| Super Admin | `superadmin@newvision.local` |
| IT Admin | `itadmin@newvision.local` |
| IT Support | `support@newvision.local` |
| Manager | `manager@newvision.local` |
| Employee | `employee@newvision.local` |

## Local development (without Docker)

Use **Node.js 24.16+** and PostgreSQL **16**. Create databases `newvision` and `newvision_test`.

**Backend**

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run start:dev
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL` if the API is not at `http://localhost:3000/api`.

## Documentation

| Document | Purpose |
|----------|---------|
| [`docs/TECHNICAL_REFERENCE.md`](docs/TECHNICAL_REFERENCE.md) | Architecture, API surface, RBAC, workflows, env vars, testing, operations |
| [`docs/GO_LIVE_REQUIREMENTS.md`](docs/GO_LIVE_REQUIREMENTS.md) | Pre-production checklist (Entra, mailbox, VPS, bootstrap admins) |
| [`docs/handoff/`](docs/handoff/) | PDF developer and functional specifications |
| [`docs/user-guide/`](docs/user-guide/) | End-user flow and usage guide |

## Testing

From `backend/`:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

E2e tests need PostgreSQL and `DATABASE_URL_TEST` (see `backend/.env.example`).

From `frontend/`:

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Playwright expects the API on port 3000 with seeded data. CI runs the same checks in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Repository layout

```
IT_ADMIN/
├── backend/           NestJS API, Prisma, Jest
├── frontend/          Vite SPA, Playwright e2e
├── docs/              Product and engineering documentation
├── design-reference/  Design tokens and HTML reference
├── docker-compose.yml
└── .github/workflows/
```
