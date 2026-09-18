# NewVision Technical Reference

Consolidated engineering documentation (formerly separate files under `docs/`).

## Table of Contents

- [Developer handover](#developer-handover-newvision)
- [Architecture](#architecture)
- [Project map](#project-map)
- [Functional specification](#functional-specification-newvision)
- [Role and permission matrix](#role-and-permission-matrix)
- [Cross-module workflows](#cross-module-workflows)
- [API reference](#api-reference)
- [Technical change guide](#technical-change-guide)
- [Setup and deployment](#setup-and-deployment)
- [E2E testing](#backend-end-to-end-tests)
- [Manual walkthrough](#manual-walkthrough-local-sign-off)
- [Completion checklist](#newvision-asset-manager-completion-checklist-verified-2026-09-17)
- [Known issues](#known-technical-issues-and-tech-debt)
- [Troubleshooting](#troubleshooting)
- [Backup and restore](#backup-and-restore-drill)
- [Runbook rollback](#render-deploy-rollback-phase-10)
- [Pilot rollout plan](#newvision-it-admin-pilot-rollout-plan)
- [CORS and CSP](#cors-and-csp-phase-10)
- [Database pool](#database-connection-pool-phase-10)
- [Import scalability](#large-import-export-phase-7)
- [Observability](#observability-phase-10)
- [Node on Windows](#nodejs-on-windows-stability)
- [Entra JIT eligibility](#entra-jit-eligibility-microsoft-side-setup)
- [Entra MFA transition](#mfa-transition-local-totp-entra-conditional-access)

---

<a id="developer-handover-newvision"></a>

## Developer handover — NewVision

**Mode A (fresh)** · **2026-09-16**  
**Functional behavior:** [`TECHNICAL_REFERENCE.md#functional-specification-newvision`](#functional-specification-newvision) · [`TECHNICAL_REFERENCE.md#role-and-permission-matrix`](#role-and-permission-matrix) · [`TECHNICAL_REFERENCE.md#cross-module-workflows`](#cross-module-workflows)

---

### Executive overview

NewVision is a **multi-tenant IT asset management** product: inventory, helpdesk, maintenance, procurement, and staff chat for company workspaces (tenants). The repo is a **two-package monorepo** (`backend/`, `frontend/`) with Docker Compose for local dev and Render for production.

---

### System purpose (brief)

Each **tenant** (company) manages employees, assets, tickets, and optional procurement/chat on a **shared PostgreSQL** database with **`tenantId` isolation**. End-user flows: [`docs/user-guide/`](./user-guide/). Business rules: functional spec.

---

### Technology stack (Phase 2)

| Category | Choice | Source |
|----------|--------|--------|
| Language | TypeScript 7 | `package.json` both packages |
| Runtime | Node **24** (CI + `engines >=24.16.0`) | `.github/workflows/ci.yml`, `package.json` |
| API framework | NestJS **11.2.x** (CJS) | `backend/package.json`, [`TECHNICAL_REFERENCE.md#architecture`](#architecture) |
| ORM | Prisma **7.10.0** + `@prisma/adapter-pg` | `prisma.config.ts`, `prisma.service.ts` |
| UI | React 19, Refine 5/6, Ant Design 5, Vite 7, React Router 7 | `frontend/package.json` |
| Auth | JWT + refresh cookie `nv_refresh` | `auth/`, `refresh-cookie.ts` |
| Realtime | Socket.IO | `chat.gateway.ts` |
| Jobs | Hostinger HTTP cron → `/api/internal/cron/*` | See [Scheduled jobs](#scheduled-jobs-hostinger-http-cron) below |
| Lint/format | Biome 2.5 | `npm run lint` |
| Unit tests | Jest 30 + `@swc/jest` | `backend/jest` config |
| API e2e | Jest + Supertest + Postgres `newvision_test` | `backend/test/` |
| UI e2e | Playwright | `frontend/e2e/` |
| Deploy | Render blueprint + Docker API image | `render.yaml` |
| Email | Resend (HTTPS) or SMTP (`nodemailer`) | `mailer.service.ts` |
| Inbound mail | IMAP (`imapflow`) or webhook | `email-inbox.service.ts` |

---

### Repository structure

See [`TECHNICAL_REFERENCE.md#project-map`](#project-map) (Phase 1 tree + responsibility map).

---

### Architecture

[`TECHNICAL_REFERENCE.md#architecture`](#architecture) — system diagram (Mermaid + ASCII), ER diagram, dependency diagram, crons, request pipeline.

---

### Route index

[`TECHNICAL_REFERENCE.md#project-map`](#project-map) — all **DEFINED** routes + **REFERENCED** `/signup`, `/trust`.

---

### API

[`TECHNICAL_REFERENCE.md#api-reference`](#api-reference) + machine index [`handoff/api-routes-index.md`](./handoff/api-routes-index.md) (**283** routes).

---

### Data model

- Schema: [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma) — **75** models, **40+** enums.
- Tenancy: `tenantId` on operational entities; `Tenant` is root.
- Asset FSM: [`lifecycle.ts`](../backend/src/assets/lifecycle.ts).
- Ticket FSM: [`tickets.lifecycle.ts`](../backend/src/tickets/tickets.lifecycle.ts).
- Maintenance FSM: [`maintenance-status.ts`](../backend/src/maintenance/maintenance-status.ts).

---

### Auth mechanism (Phase 7 — not role matrix)

| Item | Status | Source |
|------|--------|--------|
| Login `POST /api/auth/login` | **IMPLEMENTED** | `auth.controller.ts` |
| Refresh cookie httpOnly, path `/api/auth` | **IMPLEMENTED** | `refresh-cookie.ts` |
| Access token in `sessionStorage` (`TOKEN_KEY`) | **IMPLEMENTED** | `providers/session.ts`, `authProvider.ts` |
| Legacy `localStorage` token cleanup on write | **IMPLEMENTED** | `session.ts` |
| `JwtAuthGuard` + `@Public()` | **IMPLEMENTED** | `jwt-auth.guard.ts`, `public.decorator.ts` |
| `RolesGuard` | **IMPLEMENTED** | `roles.guard.ts` |
| `TenantInterceptor` | **IMPLEMENTED** | `tenant.interceptor.ts` |
| `ModulesGuard` (procurement/chat/maintenance) | **IMPLEMENTED** | `modules.guard.ts`, `plans.ts` |
| MFA TOTP endpoints | **IMPLEMENTED** | `auth.controller.ts` (`mfa/*`) |
| Super Admin MFA required in prod | **EXPECTED BUT NOT VERIFIED** — logic commented in `auth.service.ts` ~310–312 |
| Helmet minimal CSP on API | **IMPLEMENTED** | `configure-app.ts` |
| CORS credentials + exposed count headers | **IMPLEMENTED** | `configure-app.ts` |
| Login rate limit 8 failures / 15 min | **IMPLEMENTED** | `login-rate-limit.ts` |
| Upload allow/block extensions, 8MB max | **IMPLEMENTED** | `uploads.ts` |
| Email ingest secret compare | **IMPLEMENTED** | `email-inbox.controller.ts` |
| Password hashing bcrypt | **IMPLEMENTED** | `auth.service.ts`, `common/password.ts` |

---

### State management (Phase 8)

| Layer | Responsibility |
|-------|----------------|
| `authProvider` | Login, identity, logout; writes JWT + user JSON to session |
| `dataProvider` | Refine CRUD → REST; pagination headers |
| `accessControlProvider` | `canAccessResource` from `access.ts` |
| `httpClient` / axios | Base URL from `VITE_API_URL`, Bearer interceptor |
| React local state | Forms, modals, chat UI |
| `localStorage` | DataGrid prefs, sider collapse, ticket/request form defaults, help votes, chat filter — grep `localStorage` in `frontend/src` |
| Chat presence/messages | REST + Socket.IO; partial localStorage for UI prefs |

**Server-authoritative:** permissions, asset/ticket status, tenant scope, module flags.

---

### Dependencies (Phase 9)

See dependency diagram in [`TECHNICAL_REFERENCE.md#architecture`](#architecture). **HIGH IMPACT:** `app.module.ts`, `prisma.service.ts`, `permissions.ts`, `access.ts`, `App.tsx`, `configure-app.ts`, `tenant.interceptor.ts`, `dataProvider.ts`, `lifecycle.ts`, `tickets.lifecycle.ts`.

---

### Configuration (Phase 10)

| NAME | PURPOSE | REQUIRED? | WHERE USED | EXAMPLE | DEFAULT | ENV |
|------|---------|-----------|------------|---------|---------|-----|
| `DATABASE_URL` | Postgres connection | Yes (runtime) | Prisma, seed | `postgresql://…` | — | all |
| `JWT_SECRET` | Access token signing | Prod yes | auth, jwt.strategy | (secret) | dev fallback in tests | all |
| `JWT_REFRESH_SECRET` | Refresh token | Prod recommended | auth.service | (secret) | falls back JWT_SECRET | prod |
| `JWT_EXPIRES_IN` | Access TTL | No | auth module | `15m` / `30m` | `15m` in .env.example | all |
| `NODE_ENV` | Mode | No | many | `production` | — | all |
| `PORT` | HTTP port | No | main.ts | `3000` | 3000 | all |
| `CORS_ORIGIN` | Allowed SPA origins | No | configure-app, chat gateway | `http://localhost:5173` | localhost | all |
| `SWAGGER_ENABLED` | OpenAPI UI | No | configure-app | `true`/`false` | non-prod on | all |
| `SEED_ON_START` | Run seed on container start | No | docker-entrypoint | `true` | false locally | dev |
| `SEED_IF_EMPTY` | Skip seed if users exist | No | seed.ts | `true` | — | dev/prod |
| `SEED_MODE` | `bootstrap` = admin only | No | seed.ts | `bootstrap` | — | prod |
| `BOOTSTRAP_ADMIN_*` | First super admin | If bootstrap | seed.ts | email/name | — | prod |
| `ALLOW_DEMO_LOGINS` | `@newvision.local` demos | No | demo-logins.ts, seed | `true` | non-prod | all |
| `PUBLIC_APP_URL` | QR + email links | No | scan-url, templates | `http://localhost:5173` | localhost | all |
| `RESEND_API_KEY` | HTTPS mail | Prod recommended | mailer.service | (secret) | — | prod |
| `SMTP_*` / `MAIL_FROM` | SMTP mail | Optional | mailer.service | — | console log | all |
| `HELPDESK_MAILBOX` | Reply-To / ingest | Optional | tickets, email-in | `it@…` | — | prod |
| `IMAP_*` | Poll mailbox | Optional | email-inbox.service | — | disabled | prod |
| `EMAIL_INGEST_SECRET` | Webhook auth | Optional | email-inbox.controller | (secret) | — | prod |
| `HOSTING_REGION` | Health metadata | No | hosting.ts | `singapore` | singapore | prod |
| `PLATFORM_ADMIN_SECRET` | Platform tenant ops | Optional | tenant.controller | (secret) | — | ops |
| `TOTP_ENCRYPTION_KEY` | MFA secret encryption | Optional | crypto-secret.ts | (secret) | JWT-derived | prod |
| `PROCUREMENT_MATCH_TOLERANCE_PCT` | Invoice match | No | procurement/constants | `2` | 2 | all |
| `FORCE_LOGIN_RATE_LIMIT` | Test rate limit | Test only | login-rate-limit | `true` | — | test |
| `DATABASE_URL_TEST` | E2E DB | E2E | test/global-setup | — | — | test |
| `VITE_API_URL` | API base | Build-time | axios.ts | `http://localhost:3000/api` | — | fe |
| `VITE_SHOW_DEMO` | Demo hints on login | No | login.tsx | not `false` | show | fe |

---

### Local setup (Phase 11)

[`TECHNICAL_REFERENCE.md#setup-and-deployment`](#setup-and-deployment) — **executed:** typecheck, unit tests (**153**), backend e2e (**206/206**), Playwright (**102/102**), frontend build, health 200.

---

### Build / deploy (Phase 12)

- **CI:** lint, typecheck, test, build — see `ci.yml`.
- **Render:** `newvision-db`, `newvision-api`, `newvision-web`; health `/api/health`.
- **Docker backend:** multi-stage; entrypoint migrates + optional seed.
- **Human steps:** Resend domain, bootstrap secrets, DNS to Render URLs.

---

### Errors & observability (Phase 13)

- Nest: standard HTTP exceptions; validation pipe 400.
- Health: [`health.controller.ts`](../backend/src/health/health.controller.ts) — 503 if DB down.
- Frontend: login 429 message *"Too many attempts. Try again in 15 minutes."* — `authProvider.ts`.
- Crons: IMAP skips silently if no host; warranty/ticket crons log via Nest logger — **EXPECTED BUT NOT VERIFIED** per-cron failure paths.

[`TECHNICAL_REFERENCE.md#troubleshooting`](#troubleshooting)

---

### Testing (Phase 14)

| Suite | Command | DB needed |
|-------|---------|-----------|
| Backend unit | `cd backend && npm test` | No (mocked Prisma) |
| Backend e2e | `npm run test:e2e` | Yes `newvision_test` |
| Frontend | `npm run typecheck && npm run build` | No |
| Playwright | `cd frontend && npm run test:e2e` | Yes + API :3000 |

Jest e2e: `test/global-setup.ts` creates DB + `migrate deploy`.

---

### Rationale (Phase 16)

See [`TECHNICAL_REFERENCE.md#technical-change-guide`](#technical-change-guide) and [`TECHNICAL_REFERENCE.md#architecture`](#architecture) for stack choices (Prisma 7 adapter, Nest 11 + Jest CJS, Biome, custom Refine data provider, in-process import jobs, QR encodes frontend URL, Docker image includes seed tooling).

---

### Change guides (Phase 17)

[`TECHNICAL_REFERENCE.md#technical-change-guide`](#technical-change-guide)

---

### Known issues (Phase 18)

[`TECHNICAL_REFERENCE.md#known-technical-issues-and-tech-debt`](#known-technical-issues-and-tech-debt)

---

### Glossary (Phase 19)

| Term | Meaning |
|------|---------|
| Tenant | Company workspace (`Tenant` row) |
| Permission key | `asset:read` style string |
| Refine resource | Named entity in `App.tsx` |
| Module gate | procurement / chat / maintenance flags |
| FSM | lifecycle.ts / tickets.lifecycle.ts tables |

---

### Quick reference

```bash
docker compose up --build    # preferred local
cd backend && npm run start:dev
cd frontend && npm run dev
curl http://localhost:3000/api/health
```

**Top 10 files:** `app.module.ts`, `schema.prisma`, `permissions.ts`, `access.ts`, `App.tsx`, `configure-app.ts`, `tenant.interceptor.ts`, `dataProvider.ts`, `lifecycle.ts`, `tickets.service.ts`

**Do not touch casually:** RBAC matrices, lifecycle tables, migration history, `TenantInterceptor` scoping.

**Debug:** `GET /api/health`, `docker compose logs backend`, `npm test`, `backend/test/prompt37-tenancy.e2e-spec.ts`

---

### Coverage scorecard (Phase 19 — technical)

| Metric | Value |
|--------|-------|
| Files/dirs inspected vs ~400 meaningful source files | ~120+ directly read/grepped; all 36 controllers indexed |
| % routes documented (App.tsx) | **30 DEFINED** route entries; **2 REFERENCED** orphans → **93%** of linked pages defined |
| % env vars referenced in code documented | **~32 names** in table vs ~35 grep hits → **~91%** |
| `NOT VERIFIED` count | **4** (Docker full stack, API e2e, Playwright, Super Admin MFA enforcement) |
| `UNKNOWN` link count | **2** (`/signup`, `/trust` router) |
| API routes indexed | **283** (generated) |
| Mandatory diagrams | **3/3** (system, ER, dependency) in [Architecture](#architecture) |

---

<a id="architecture"></a>

## Architecture

**Handover:** Mode A, **2026-09-16**.  
**Evidence:** [`backend/src/app.module.ts`](../backend/src/app.module.ts), [`TECHNICAL_REFERENCE.md#technical-change-guide`](#technical-change-guide).

---

### Phase 3 — System architecture

Layers: **Browser SPA** → **NestJS HTTP + WebSocket** → **Prisma/pg** → **PostgreSQL**; sidecars **email**, **IMAP**, **outbound webhooks**.

```mermaid
flowchart TB
  subgraph Frontend["Frontend (Vite + React)"]
    UI["Refine resources + pages\nfrontend/src/"]
    Providers["authProvider · dataProvider · accessControlProvider"]
  end
  subgraph API["API (NestJS 11)"]
    subgraph Pipeline["Request pipeline"]
      G1["JwtAuthGuard"]
      G2["RolesGuard"]
      G3["ModulesGuard"]
      TI["TenantInterceptor"]
    end
    Domains["Assets · Tickets · Procurement · Chat · Tenancy · …"]
  end
  subgraph DB["PostgreSQL 16"]
    PG[(tenant-scoped rows)]
  end
  subgraph External["External"]
    Mail["Resend / SMTP"]
    IMAP["IMAP mailbox"]
    WH["Customer webhook URLs"]
  end
  UI --> Providers
  Providers -->|REST /api| G1 --> G2 --> G3 --> TI --> Domains
  UI -->|Socket.IO| Domains
  Domains --> PG
  Domains --> Mail
  Domains --> IMAP
  Domains --> WH
```

```
┌──────────────┐   JWT + cookie    ┌─────────────────────────────────┐
│ Refine SPA   │ ────────────────► │ JwtAuth → Roles → Modules       │
│ :5173        │                   │ TenantInterceptor → Services    │
└──────┬───────┘                   └───────────────┬─────────────────┘
       │ Socket.IO (chat)                           │
       └──────────────────────────────────────────►│
                                                   ▼
                                            ┌─────────────┐
                                            │ PostgreSQL  │
                                            └─────────────┘
```

#### Request lifecycle

1. [`configure-app.ts`](../backend/src/configure-app.ts) — Helmet (minimal CSP on API), `cookie-parser`, CORS (`CORS_ORIGIN`), global prefix `api`, `ValidationPipe`.
2. [`JwtAuthGuard`](../backend/src/common/guards/jwt-auth.guard.ts) — skip if `@Public()`.
3. [`RolesGuard`](../backend/src/common/guards/roles.guard.ts) — role/permission metadata.
4. [`ModulesGuard`](../backend/src/tenancy/modules.guard.ts) — procurement/chat/maintenance when disabled on tenant.
5. [`TenantInterceptor`](../backend/src/tenancy/tenant.interceptor.ts) — tenant context for queries.
6. Service layer — business rules, Prisma transactions, audit.

#### Scheduled jobs (Hostinger HTTP cron)

All background work is triggered by **hPanel Cron Jobs** calling `POST /api/internal/cron/<job>` with header `X-Cron-Secret` matching env `CRON_SECRET`. There is **no** in-process `@nestjs/schedule` runner. See [`MIGRATION_NOTES.md`](../MIGRATION_NOTES.md) § Scheduled Jobs Migration for curl examples.

| Recommended schedule | Endpoint | Former `@Cron` name |
|---------------------|----------|---------------------|
| Every 5 min | `poll-email-tickets` | email-in-poll |
| Daily 08:00 | `warranty-alerts` | warranty-threshold-alerts |
| Mon 08:00 | `warranty-weekly-digest` | warranty-weekly-digest |
| Daily 08:00 | `ticket-daily-digest` | ticket-daily-digest |
| Hourly | `ticket-overdue-mail` | ticket-overdue-mail |
| Hourly | `ticket-sla-escalation` | ticket-sla-escalation |
| Daily 08:00 | `contract-renewals` | contract-renewal-alerts |
| Daily 03:00 | `audit-prune` | prune-auth-audit |
| Daily 08:00 | `audit-cycle-reminders` | audit-cycle-reminders |
| Mon 08:00 | `scheduled-weekly-reports` | scheduled-weekly-reports |

#### WebSocket

[`chat.gateway.ts`](../backend/src/chat/chat.gateway.ts) — staff chat channels, presence, typing.

---

### Phase 6 — Data model (summary)

- **58** Prisma models ([`schema.prisma`](../backend/prisma/schema.prisma)).
- **Tenancy:** Operational models include `tenantId Int` + relation to `Tenant` (100+ `tenantId` references in schema). Global/reference tables: `Role`, `Permission` (seeded RBAC catalog).
- **Seed flags:** `SEED_ON_START`, `SEED_IF_EMPTY`, `SEED_MODE=bootstrap`, `BOOTSTRAP_ADMIN_*` — [`docker-entrypoint.sh`](../backend/docker-entrypoint.sh), [`prisma/seed.ts`](../backend/prisma/seed.ts), README.

#### ER diagram (core + procurement)

```mermaid
erDiagram
  Tenant ||--o{ User : has
  Tenant ||--o{ Employee : has
  Tenant ||--o{ Asset : has
  Tenant ||--o{ SupportTicket : has
  Tenant ||--o{ AssetRequest : has
  Tenant ||--o{ Vendor : has
  User }o--o| Employee : links
  Employee ||--o{ AssetAssignment : receives
  Asset ||--o{ AssetAssignment : history
  Asset ||--o{ AssetMaintenance : repairs
  Employee ||--o{ SupportTicket : requests
  SupportTicket ||--o{ TicketComment : thread
  Employee ||--o{ AssetRequest : requester
  Vendor ||--o{ PurchaseRequisition : supplies
  PurchaseRequisition ||--o{ PurchaseOrder : converts
  PurchaseOrder ||--o{ GoodsReceipt : receives
  Tenant ||--o{ AuditLog : audits
```

```
Tenant
 ├── User ── Employee
 ├── Asset ── AssetAssignment ── Employee
 ├── AssetMaintenance ── Asset
 ├── SupportTicket ── TicketComment
 ├── AssetRequest ── Employee (requester)
 ├── Vendor ── PurchaseRequisition ── PurchaseOrder ── GoodsReceipt
 └── AuditLog
```

---

### Phase 9 — High-centrality dependency diagram

```mermaid
flowchart TD
  AppModule["app.module.ts"]
  AppTsx["frontend/src/App.tsx"]
  Perms["permissions.ts"]
  Access["access.ts"]
  Prisma["prisma.service.ts"]
  Configure["configure-app.ts"]
  TenantI["tenant.interceptor.ts"]
  Lifecycle["assets/lifecycle.ts"]
  TkLife["tickets.lifecycle.ts"]
  DataP["dataProvider.ts"]
  AuthP["authProvider.ts"]
  AppModule --> Perms
  AppModule --> Prisma
  AppModule --> TenantI
  AppModule --> Configure
  AppTsx --> Access
  AppTsx --> DataP
  AppTsx --> AuthP
  Access -. mirror .-> Perms
  AssetsService["assets.service.ts"] --> Lifecycle
  TicketsService["tickets.service.ts"] --> TkLife
  DataP --> AuthP
```

```
HIGH IMPACT files:
  app.module.ts          — registers all modules + global guards
  prisma.service.ts      — every DB access
  permissions.ts         — server RBAC
  access.ts              — client nav + can()
  App.tsx                — routes + Refine resources
  tenant.interceptor.ts  — tenant isolation
  configure-app.ts       — security + CORS + prefix
  lifecycle.ts           — asset FSM
  tickets.lifecycle.ts   — ticket FSM
  dataProvider.ts        — all list/show API calls
```

---

### Module boundaries (Nest)

See [`app.module.ts`](../backend/src/app.module.ts) imports — each folder under `backend/src/<name>/` is typically `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto.ts`.

Frontend **Refine resources** in [`App.tsx`](../frontend/src/App.tsx) align with API resource names but not 1:1 with Nest module names (e.g. `support-tickets` → tickets API).

---

### Related

- [`TECHNICAL_REFERENCE.md#api-reference`](#api-reference)
- [`TECHNICAL_REFERENCE.md#project-map`](#project-map)
- [`TECHNICAL_REFERENCE.md#functional-specification-newvision`](#functional-specification-newvision)

---

<a id="project-map"></a>

## Project map

**Handover:** Mode A, **2026-09-16**.

---

### Phase 1 — Repository tree (depth ~4)

```
IT_ADMIN/
├── backend/
│   ├── prisma/                 schema, migrations, seed.ts, prisma.config.ts
│   ├── src/                    Nest modules (auth, assets, tickets, …)
│   ├── test/                   Jest e2e + global-setup.ts
│   ├── Dockerfile
│   └── docker-entrypoint.sh
├── frontend/
│   ├── src/
│   │   ├── pages/              Route-aligned screens
│   │   ├── providers/          auth, axios, data, session
│   │   ├── components/         DataGrid, RoleRouteGuard, …
│   │   ├── access.ts           Nav + RBAC mirror
│   │   └── App.tsx             Routes + Refine resources
│   └── e2e/                    Playwright
├── docs/                       Handover + user-guide + BACKUP
├── .github/workflows/          ci.yml, keep-alive.yml
├── docker-compose.yml
├── render.yaml
├── README.md
└── docs/                  Handover, API, setup, workflows (see README)
```

**Generated (omit from hand-edit maps):** `node_modules/`, `dist/`, `.prisma/client`.

---

### Phase 1 — File / folder responsibility map

| Path | What it does | Why it exists | Depends on it | Risk if changed |
|------|--------------|---------------|---------------|-----------------|
| `backend/prisma/schema.prisma` | DB models, enums, indexes | Single schema truth | All services | Migration required |
| `backend/prisma/migrations/` | Applied DDL history | Deploy reproducibility | `migrate deploy` | Irreversible without backup |
| `backend/src/app.module.ts` | Root module, global guards | Bootstraps API | All feature modules | Breaks DI graph |
| `backend/src/common/rbac/permissions.ts` | `ROLE_PERMISSIONS`, `can()` | Server authorization | Guards, seed | Security drift |
| `backend/src/tenancy/` | Tenant context, plans, signup | Multi-tenant SaaS | Most models | Data leaks if broken |
| `backend/src/configure-app.ts` | CORS, Helmet, prefix, pipes | HTTP hardening | `main.ts` | Break SPA or cookies |
| `backend/src/assets/lifecycle.ts` | Asset status FSM | Inventory rules | `assets.service.ts` | Invalid states |
| `backend/src/tickets/tickets.lifecycle.ts` | Ticket status FSM | Helpdesk rules | `tickets.service.ts` | SLA/workflow bugs |
| `frontend/src/App.tsx` | Router + Refine resources | UI entry | All pages | Orphan screens |
| `frontend/src/access.ts` | `navForRole`, client `can()` | Role-specific UX | Sider, RoleRouteGuard | Nav/API mismatch |
| `frontend/src/providers/dataProvider.ts` | REST mapping for Refine | List/show/create | All CRUD pages | Pagination breaks |
| `docker-compose.yml` | Local 3-tier stack | Dev onboarding | Docker | Wrong ports/env |
| `render.yaml` | Production topology | Render blueprint | Deploy | Outage |
| `.github/workflows/ci.yml` | Quality gate | PR safety | npm scripts | Regressions ship |

---

### Phase 4 — Route map (`App.tsx` = source of truth)

Classification: **DEFINED** = `Route` in [`App.tsx`](../frontend/src/App.tsx).

| Path | Layout | Component | Guard / notes | Classification |
|------|--------|-----------|---------------|----------------|
| `/scan/:code` | None | `pages/scan` | Public | **DEFINED** |
| `/reset-password` | None | `pages/reset-password` | Public | **DEFINED** |
| `/login` | Auth shell | `pages/login` | Redirect if logged in | **DEFINED** |
| `/` | ThemedLayout + RoleRouteGuard | `pages/dashboard` | `navForRole` | **DEFINED** |
| `/assets`, `/assets/create`, `/assets/edit/:id`, `/assets/show/:id` | Same | assets pages | IT + scoped employee | **DEFINED** |
| `/employees`, `/employees/show/:id` | Same | list / profile | Profile exception in guard | **DEFINED** |
| `/locations/*` | Same | locations | IT Admin nav | **DEFINED** |
| `/accessories`, `/consumables`, `/requests` | Same | list pages | | **DEFINED** |
| `/maintenance` | Same | maintenance | Module: maintenance | **DEFINED** |
| `/tickets/*` | Same | tickets | | **DEFINED** |
| `/procurement/vendors/*` | Same | vendors | Module: procurement | **DEFINED** |
| `/procurement/requisitions/*` | Same | requisitions | | **DEFINED** |
| `/procurement/orders/*` | Same | POs | | **DEFINED** |
| `/procurement/contracts/*` | Same | contracts | | **DEFINED** |
| `/reports` | Same | reports | | **DEFINED** |
| `/audit-logs` | Same | audit | Super/IT Admin | **DEFINED** |
| `/settings` | Same | settings tabs | | **DEFINED** |
| `/help/*` | No main sider | HelpSection | Authenticated | **DEFINED** |
| `/chat` | No main sider | ChatPage | Staff + module chat | **DEFINED** |
| `/signup` | — | `pages/signup.tsx` | Linked from login | **REFERENCED** (no Route) |
| `/trust` | — | `pages/trust.tsx` | Linked from login/signup | **REFERENCED** (no Route) |

[`RoleRouteGuard`](../frontend/src/components/RoleRouteGuard.tsx): redirects to `/` if path not in `navForRole` (except `/help`, employee profile).

---

### Phase 4 — “Where do I find it?”

| Task / feature | Location | Symbol |
|----------------|----------|--------|
| Add sidebar item | `frontend/src/access.ts` | `navForRole` |
| Block route by role | `frontend/src/components/RoleRouteGuard.tsx` | `RoleRouteGuard` |
| Add HTTP API | `backend/src/<m>/<m>.controller.ts` | `@Controller` |
| Enforce permission | `backend/src/common/rbac/permissions.ts` | `can()` |
| Asset status change | `backend/src/assets/lifecycle.ts` | `assertTransition` |
| Ticket status change | `backend/src/tickets/tickets.lifecycle.ts` | `canTransitionTicket` |
| Tenant trial/modules | `backend/src/tenancy/plans.ts` | `effectiveModules` |
| List query params | `backend/src/common/query.ts` | `parseListQuery` |
| Upload allow-list | `backend/src/common/uploads.ts` | `assertAllowedUpload` |
| Login rate limit | `backend/src/auth/login-rate-limit.ts` | `LoginRateLimitService` |
| E2E tenant isolation | `backend/test/prompt37-tenancy.e2e-spec.ts` | — |

---

### Phase 15 — Links and static assets

| Asset | Path | Classification |
|-------|------|----------------|
| Brand PNGs | `frontend/public/brand/` | **DEFINED** — verify on disk in checkout |
| Favicon / index | `frontend/index.html` | **DEFINED** |
| User guide diagrams | `docs/user-guide/rendered/*.png` (+ [`NewVision_System_Flow_and_Usage_Guide.pdf`](./user-guide/NewVision_System_Flow_and_Usage_Guide.pdf)) | **DEFINED** (docs only) |

External: Render URLs from `render.yaml`; `PUBLIC_APP_URL` for QR and emails.

---

<a id="functional-specification-newvision"></a>

## Functional specification — NewVision

**Mode A (fresh)** · **2026-09-16**  
**Technical:** [`TECHNICAL_REFERENCE.md#developer-handover-newvision`](#developer-handover-newvision) · [`TECHNICAL_REFERENCE.md#architecture`](#architecture)  
**Splits:** [`TECHNICAL_REFERENCE.md#role-and-permission-matrix`](#role-and-permission-matrix) · [`TECHNICAL_REFERENCE.md#cross-module-workflows`](#cross-module-workflows)

---

### Phase 1 — Functional inventory

| Module | Nest folder | Sidebar (`navForRole`) | Screens | Purpose |
|--------|-------------|------------------------|---------|---------|
| Dashboard | `dashboard/` | Home / Team / Dashboard | `/` | KPIs, checklist, role summaries |
| Assets | `assets/` | My kit / Assets | `/assets/*` | Inventory lifecycle |
| Employees | `employees/` | Team people / Employees | `/employees/*` | HR records, offboard |
| Locations | `locations/` | Locations (IT) | `/locations/*` | Sites |
| Accessories | `accessories/` | Accessories | `/accessories` | Peripherals stock |
| Consumables | `consumables/` | Consumables | `/consumables` | Consumable stock |
| Requests | `asset-requests/` | Requests | `/requests` | Employee requests |
| Maintenance | `maintenance/` | Maintenance | `/maintenance` | Repair tickets + asset coupling |
| Tickets | `tickets/` | My tickets / Support | `/tickets/*` | Helpdesk |
| Chat | `chat/` | Chat | `/chat` | Staff messaging |
| Procurement | `procurement/` | Vendors, Requisitions, POs, Contracts | `/procurement/*` | Vendor → PO chain |
| Reports | `reports/` | Reports | `/reports` | CSV/PDF exports |
| Audit | `audit/` | Audit Log | `/audit-logs` | Compliance trail |
| Settings | users, import-jobs, etc. | Settings / Account | `/settings` | Admin configuration |
| Help | — | Help | `/help/*` | In-app articles |
| Public scan | `public-assets/` | — | `/scan/:code` | QR card |
| Tenancy | `tenancy/` | Workspace tab | settings/workspace | Trial, export, delete |

**Roles:** `SUPER_ADMIN`, `IT_ADMIN`, `IT_SUPPORT`, `MANAGER`, `EMPLOYEE` — confirmed in [`schema.prisma`](../backend/prisma/schema.prisma) `RoleName`.

**Plan gating:** [`effectiveModules()`](../backend/src/tenancy/plans.ts) — Starter vs Team trial; onboarding hides procurement/chat/maintenance until complete (`filterNav` in `access.ts`).

---

### Phase 2 — Roles and permissions

Full matrix: [`TECHNICAL_REFERENCE.md#role-and-permission-matrix`](#role-and-permission-matrix).

---

### Phase 3 — Feature deep dive (high priority)

#### Multi-tenant signup / trial

- **Trigger:** `POST /api/auth/signup` — **server** **IMPLEMENTED**.
- **UI:** `pages/signup.tsx` → **REFERENCED** (no router) — login links `/signup`.
- **Trial:** 14 days Team modules when `status=trial` and not expired — **server** `plans.ts`.
- **Downgrade:** Expired trial → Starter modules (`procurement`, `chat`, `maintenance` false).
- **Errors:** Validation via DTOs on signup — exact strings **NOT VERIFIED** without running app.

#### Dashboard and welcome checklist

- **API:** `GET /api/dashboard/setup`, metrics, attention — `dashboard.controller.ts`.
- **Banner `seedWipeRisk`:** when `SEED_ON_START` without safe empty guard — `dashboard.controller.ts` ~83–84.

#### Assets

- **CRUD:** permission keys `asset:*`; delete only Super Admin + retired/disposed — **server** DECISIONS + assets service.
- **Assign/transfer/retire:** lifecycle enforced — **server** `lifecycle.ts`.
- **Import:** sync `/import/*` and async `import-jobs` — **server**.
- **QR audit:** `audit-by-code`, public scan card — **server** + `/scan/:code`.
- **Employee view:** scoped list — **server**.

#### Employees and offboarding

- **Offboard:** `POST /api/employees/:id/offboard` — returns/reassigns assets, checks in accessories — **server** `employees.service.ts` ~462+.
- **Error:** *"Cannot reassign assets to the employee being offboarded"* — **server** 487.

#### Asset requests

- See [`TECHNICAL_REFERENCE.md#cross-module-workflows`](#cross-module-workflows) §3; rejection reason required — **server** 143–145.

#### Support tickets

- Lifecycle: [`tickets.lifecycle.ts`](../backend/src/tickets/tickets.lifecycle.ts).
- Internal vs public comments — verify `tickets.service.ts` visibility flags — **NOT VERIFIED** every path.
- Email in/out — README + `email-inbox.service.ts`.

#### Maintenance

- FSM: [`maintenance-status.ts`](../backend/src/maintenance/maintenance-status.ts); asset status in same transaction — **server** DECISIONS Phase 2.

#### Procurement

- Enums in schema § `VendorStatus`, `PurchaseRequisitionStatus`, `PurchaseOrderStatus`.
- GSTIN validation — **server** `gstin-pan.ts`.
- Workflow diagram — [`TECHNICAL_REFERENCE.md#cross-module-workflows`](#cross-module-workflows) §4.

#### Chat

- Staff-only; module gate — **server** `ModulesGuard` + nav filter.
- Channels, DMs, mentions — **server** `chat.controller.ts`.

#### Reports and audit export

- `GET /api/reports` — CSV/PDF — **server** `report:run`.
- `GET /api/audit-logs/export` — **server** `audit:read`.

#### Settings

- Users, helpdesk, webhooks, import jobs, reconciliation, workspace export/delete — Settings tabs in `pages/settings/*`.

---

### Phase 4 — Status and lifecycle

#### Asset transitions

Table source: [`lifecycle.ts`](../backend/src/assets/lifecycle.ts) `ALLOWED_TRANSITIONS`.

| From | To (allowed) |
|------|----------------|
| available | assigned, pending_assignment, under_repair, retired |
| assigned | available, under_repair, lost, damaged, retired |
| retired | disposed |
| disposed | (terminal) |

**Illegal:** `assertTransition` throws `InvalidTransitionError` with allowed list in message — **server**.

```mermaid
stateDiagram-v2
  [*] --> available
  available --> assigned
  available --> under_repair
  available --> retired
  assigned --> under_repair
  assigned --> retired
  under_repair --> assigned
  under_repair --> available
  retired --> disposed
```

```
available ↔ assigned ↔ under_repair → retired → disposed
```

#### Tickets

See [`tickets.lifecycle.ts`](../backend/src/tickets/tickets.lifecycle.ts) — diagram in prior handover; illegal transition returns **server** validation error from service (grep `canTransitionTicket`).

#### Asset requests

| From | Event | To |
|------|-------|-----|
| pending | manager approve | approved |
| pending | manager reject + reason | rejected |
| approved | IT fulfill | fulfilled |

Non-pending review: *"Only pending requests can be reviewed"* — **server** 138–139.

#### Maintenance

| From | To |
|------|-----|
| reported | under_repair, cancelled |
| under_repair | repaired, cancelled |
| repaired | reassigned |

#### Import jobs (`ImportJobStatus`)

```mermaid
stateDiagram-v2
  [*] --> queued
  queued --> previewed
  previewed --> running
  running --> completed
  running --> failed
  completed --> rolled_back
```

```
queued → previewed → running → completed | failed
completed → rolled_back (rollback action)
```

Mutable guard: not `running`/`completed`/`rolled_back` for edit — `import-jobs.service.ts` `assertMutable`.

#### Vendor (`VendorStatus`)

States: `draft`, `pending_approval`, `active`, `suspended`, `blacklisted` — transitions in `vendors.service.ts` — **NOT VERIFIED** full table in this pass.

#### Purchase requisition / PO

Requisition: `draft`, `pending_approval`, `approved`, `rejected`, `converted_to_po`, `cancelled`.  
PO: `draft`, `sent`, `partially_received`, `received`, `closed`, `cancelled`.

---

### Phase 5 — Cross-module workflows

[`TECHNICAL_REFERENCE.md#cross-module-workflows`](#cross-module-workflows) — six workflows with diagrams.

---

### Phase 6 — Notifications and automation

| Trigger | Recipient | Channel | Source |
|---------|-----------|---------|--------|
| New asset request | Manager | In-app | `asset-requests.service.ts` ~117 |
| Request approved/rejected | Requester | In-app | ~174 |
| Warranty 90/60/30 days | IT Admins | In-app + email | `warranty-alert.service.ts` |
| Ticket digest / overdue | Assignees / watchers | Email | `tickets.digest.ts` |
| Contract renewal | Procurement | Cron | `contracts.service.ts` |
| Email-in new comment | Ticket participants | Ticket thread | `email-inbox.service.ts` |

---

### Phase 7 — Testable edge cases

| Case | Expected | Enforcement |
|------|----------|-------------|
| Request without employee link | 403 Forbidden | **server** |
| Reject request without reason | 400 Bad Request | **server** |
| Login 9th failure in 15 min | 429 + message | **server** |
| Cross-tenant asset ID | 404/403 | **server** e2e prompt37 |
| Upload `.exe` | Rejected | **server** `uploads.ts` |
| Trial expired, hit procurement API | 403 module | **server** ModulesGuard — **NOT VERIFIED** every endpoint |
| Hidden UI button, direct API | Must 403 | QA security |

---

### Phase 8 — Functional gaps

| Sev | Issue |
|-----|-------|
| **HIGH** | `/signup` not in `App.tsx` — trial CTA broken |
| **MEDIUM** | Help articles deny public signup; login promotes trial |
| **MEDIUM** | Help vs code for bulk assign / other — spot-check `articles.ts` |
| **LOW** | Employee finance field redaction — verify UI per field |

Drift: `permissions.ts` ↔ `access.ts` **aligned**; controller `@Roles` spot-check **NOT VERIFIED** exhaustive.

---

### Phase 9 — Glossary

| Term | Meaning |
|------|---------|
| My kit | Employee nav label for assets |
| Team devices | Manager nav label |
| TCK-###### | Ticket reference in email subject |
| Starter / Team | `TenantPlan` |
| pending_approval | Requisition awaiting approvers |

Role chips: `ROLE_CHIP` in `access.ts`.

---

### Phase 10 — Quick reference

**Purpose:** Per-tenant IT inventory, helpdesk, optional procurement/chat.  
**Roles:** 5 (see matrix).  
**Workflows:** Hire kit, request fulfill, ticket/maintenance, procurement, email-in, QR audit.  
**Terminal states:** `disposed`, `closed` (ticket reopenable), `fulfilled`, `cancelled` maintenance, `rolled_back` import.  

**Top 10 business rules before changes:**

1. Asset lifecycle table is law.  
2. Maintenance moves asset status in transaction.  
3. Manager approval only for direct reports (requests).  
4. Rejection needs reason (requests).  
5. Tenant module flags gate procurement/chat/maintenance.  
6. Super Admin only `user:manage` and `asset:delete`.  
7. Offboard must clear/reassign kit.  
8. Email-in dedupes `Message-ID`.  
9. Import rollback only deletes IDs recorded on job.  
10. Trial → Starter module fallback after expiry.

**Spec index:** Permissions → `TECHNICAL_REFERENCE.md#role-and-permission-matrix`; workflows → `TECHNICAL_REFERENCE.md#cross-module-workflows`; lifecycles → Phase 4 above.

---

### Functional coverage scorecard

| Metric | Value |
|--------|-------|
| Roles documented | **5/5** |
| Status domains (asset, ticket, request, maintenance, import) | **5/5** with diagrams |
| Procurement/vendor FSM detail | **Partial** — enums documented; transition tables **NOT VERIFIED** exhaustive |
| Cross-module workflows | **6/6** in [Workflows](#cross-module-workflows) |
| Notification triggers | **6+** listed |
| High-priority features (prompt list) | **14/14** touched in Phase 3 |
| `NOT VERIFIED` items | ~8 (exact error strings, all procurement transitions, ticket comment visibility, trial API on every route) |
| QA could write cases from doc | **Yes** for core ITSM; procurement needs service deep-read for edge cases |

---

<a id="role-and-permission-matrix"></a>

## Role and permission matrix

**Handover:** Mode A, **2026-09-16**.  
**Sources:** [`backend/src/common/rbac/permissions.ts`](../backend/src/common/rbac/permissions.ts), [`frontend/src/access.ts`](../frontend/src/access.ts).

Roles (`RoleName` enum): `SUPER_ADMIN`, `IT_ADMIN`, `IT_SUPPORT`, `MANAGER`, `EMPLOYEE`.

---

### Permission keys (server `can(role, key)`)

| Key | SUPER_ADMIN | IT_ADMIN | IT_SUPPORT | MANAGER | EMPLOYEE |
|-----|-------------|----------|------------|---------|----------|
| `asset:read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `asset:create` | ✓ | ✓ | | | |
| `asset:update` | ✓ | ✓ | | | |
| `asset:delete` | ✓ | | | | |
| `asset:assign` | ✓ | ✓ | | | |
| `asset:transfer` | ✓ | ✓ | | | |
| `asset:retire` | ✓ | ✓ | | | |
| `asset:import` | ✓ | ✓ | | | |
| `asset:export` | ✓ | ✓ | | | |
| `maintenance:read` | ✓ | ✓ | ✓ | | |
| `maintenance:manage` | ✓ | ✓ | ✓ | | |
| `employee:read` | ✓ | ✓ | ✓ | ✓ | |
| `employee:manage` | ✓ | | | | |
| `location:manage` | ✓ | ✓ | | | |
| `department:manage` | ✓ | ✓ | | | |
| `category:manage` | ✓ | ✓ | | | |
| `report:run` | ✓ | ✓ | ✓ | ✓ | |
| `audit:read` | ✓ | ✓ | | | |
| `user:manage` | ✓ | | | | |
| `request:approve` | ✓ | ✓ | | ✓ | |
| `issue:report` | ✓ | ✓ | | | ✓ |
| `asset:request` | ✓ | ✓ | | | ✓ |
| `ticket:manage` | ✓ | ✓ | ✓ | | |
| `procurement:manage` | ✓ | ✓ | | | |
| `procurement:request` | ✓ | ✓ | | ✓ | |

Frontend `ROLE_PERMISSIONS` matches except IT_ADMIN uses `ALL.filter` excluding `user:manage` and `asset:delete` — same effective set as backend IT_ADMIN row.

---

### Feature / action matrix (behavioral)

| Role | Feature / action | Allowed | Condition | Enforcement |
|------|------------------|---------|-----------|-------------|
| EMPLOYEE | View own kit | Allowed | Assets assigned to linked `employeeId` | **server** list scope |
| EMPLOYEE | View all company assets | Denied | — | **server** |
| EMPLOYEE | Create asset request | Allowed | Must have `employeeId` | **server** `asset-requests.service.ts` create |
| EMPLOYEE | Approve requests | Denied | — | **server** |
| MANAGER | Approve direct report request | Allowed | `assertManagerOf` | **server** review |
| MANAGER | Approve non-report request | Denied | — | **server** |
| IT_ADMIN | Fulfill request | Allowed | `request:approve` + IT roles | **server** fulfill |
| IT_SUPPORT | Tickets + maintenance | Allowed | Permissions | **server**; nav shows Account settings only |
| SUPER_ADMIN | Hard-delete asset | Allowed | Retired/disposed only | **server** |
| IT_ADMIN | Hard-delete asset | Denied | — | **server** |
| All IT console | Chat | Conditional | `tenant.modules.chat` + onboarding | **server** ModulesGuard + **client** nav |
| All | Procurement screens | Conditional | `modules.procurement` | **server** + **client** `filterNav` |
| All | Maintenance screen | Conditional | `modules.maintenance` | **server** + **client** |

---

### Data scope

| Role | Assets | Employees | Tickets | Requests |
|------|--------|-----------|---------|----------|
| EMPLOYEE | Own assignments | Self profile | Own / as requester | Own |
| MANAGER | Team (IT list filters) | Team | Team scope in UI | Team + approve reports |
| IT_SUPPORT | Read all tenant | Read all | Manage queue | Read |
| IT_ADMIN | Full | Full manage | Full | Full fulfill |
| SUPER_ADMIN | Full + delete retired | Full | Full | Full |

Ticket row-level rules: verify in `tickets.service.ts` list filters — **NOT VERIFIED FROM CODEBASE** line-by-line in this matrix; e2e specs cover main cases.

---

### UI visibility (shared screens)

| Screen | EMPLOYEE | MANAGER | IT_SUPPORT | IT_ADMIN |
|--------|----------|---------|------------|----------|
| Sidebar label “My kit” vs “Assets” | My kit | Team devices | Assets | Assets |
| Locations | Hidden | Hidden | Hidden | Shown |
| Settings full tabs | Hidden | Hidden | Account only | Full |
| Audit log | Hidden | Hidden | Hidden | Shown |
| Asset finance fields | Redacted/hidden | **NOT VERIFIED** per field | Read | Full |

---

### Drift check (Phase 2 / 8)

| Check | Result |
|-------|--------|
| `permissions.ts` vs `access.ts` keys | **Match** (IT_ADMIN subset aligned) |
| Nav vs API | **Risk:** client `RoleRouteGuard` only; API must reject — QA direct API |
| Help “no signup” vs login trial link | **Mismatch** — see [Known issues](#known-technical-issues-and-tech-debt) / functional gaps |

---

<a id="cross-module-workflows"></a>

## Cross-module workflows

**Handover:** Mode A, **2026-09-16**.  
Each workflow: numbered steps + Mermaid + ASCII.

---

### 1. New hire → kit visible

**Actors:** IT Admin, Employee

1. IT Admin creates `Employee` (`POST /api/employees`) — **server** `employee:manage`.
2. IT Admin creates `User` linked to employee (`POST /api/users` or `employees/:id/create-login`) — **server** `user:manage` (Super Admin) or IT flows.
3. IT assigns asset (`POST /api/assets/:id/assign`) or fulfills approved request / issues kit (`issue-kits`).
4. Employee signs in → **My kit** lists scoped assets (`GET /api/assets`).

```mermaid
sequenceDiagram
  participant IT as IT Admin
  participant API as API
  participant Emp as Employee
  IT->>API: POST /employees
  IT->>API: POST /users (link employee)
  IT->>API: POST /assets/:id/assign
  Emp->>API: GET /assets (scoped)
  API-->>Emp: assigned devices
```

```
IT Admin → create Employee → create User → assign Asset
Employee → login → GET /assets (own) → "My kit"
```

---

### 2. Broken laptop (ticket vs maintenance)

**Decision:** Employee often opens **ticket**; IT may open **maintenance** which couples **asset status**.

1. Employee: `POST /api/tickets` — **server** `issue:report` / ticket create rules.
2. IT Support: ticket → `in_progress` — [`tickets.lifecycle.ts`](../backend/src/tickets/tickets.lifecycle.ts).
3. Optional: `POST /api/maintenance` → asset `under_repair` — **server** transaction.
4. Repair complete: maintenance `reassigned` → asset `assigned` or `available`.

```mermaid
flowchart TD
  A[Employee opens ticket] --> B{IT triage}
  B --> C[Maintenance record]
  C --> D[Asset under_repair]
  D --> E[Repaired / reassigned]
  E --> F[Asset assigned or available]
  B --> G[Ticket resolved without maintenance]
```

---

### 3. Asset request → approve → fulfill

1. Employee `POST /api/asset-requests` — requires `employeeId` — **server** lines 79–84 `asset-requests.service.ts`.
2. Manager notified (`NotificationType.asset_request`).
3. Manager `PATCH .../review` — pending only; rejection needs `rejectionReason` — **server** 138–145.
4. IT Admin `PATCH .../fulfill` — assigns asset or kit — **server**.
5. Requester notified.

```mermaid
stateDiagram-v2
  [*] --> pending
  pending --> approved: manager approve
  pending --> rejected: manager reject + reason
  approved --> fulfilled: IT fulfill
  rejected --> [*]
  fulfilled --> [*]
```

---

### 4. Requisition → PO → receive

**Enums:** `PurchaseRequisitionStatus`, `PurchaseOrderStatus` in schema.

1. Requester creates requisition (draft → submit → `pending_approval`).
2. Approvers per matrix (`RequisitionApprover`) — statuses `pending`/`approved`/`rejected`.
3. Approved → `converted_to_po` → PO `draft` → `sent`.
4. Goods receipt → `partially_received` / `received` → assets may be created — **server** procurement services.

```mermaid
flowchart LR
  R[Requisition draft] --> PA[pending_approval]
  PA --> AP[approved]
  AP --> PO[Purchase Order]
  PO --> GR[Goods Receipt]
  GR --> AST[Asset create]
```

**Illegal transitions:** **NOT VERIFIED FROM CODEBASE** exhaustive table — read `requisitions.service.ts`, `purchase-orders.service.ts` throw paths.

---

### 5. Email reply → ticket comment

1. Outbound mail includes `[TCK-######]` and `Reply-To: HELPDESK_MAILBOX`.
2. IMAP cron or `POST /api/email-in/webhook` with secret.
3. Parser attaches comment or creates ticket; duplicate `Message-ID` discarded — `email-inbox.service.ts`.
4. Unmatched sender → ticket + `unmatchedSender` flag — e2e `email-in.e2e-spec.ts`.

```mermaid
sequenceDiagram
  participant M as Mailbox
  participant API as EmailInboxService
  participant T as Ticket
  M->>API: raw RFC822
  API->>T: add comment or create
```

---

### 6. Physical audit (QR)

1. QR encodes `PUBLIC_APP_URL/scan/:code` — **DEFINED** public route.
2. Authenticated audit: `POST /api/assets/audit-by-code` or asset audit endpoint.
3. Dashboard unaudited KPIs — `GET /api/dashboard/metrics`.

```mermaid
flowchart LR
  QR[Scan QR] --> P[/scan/:code public card/]
  IT[IT audit action] --> API[POST audit-by-code]
  API --> D[Dashboard KPIs]
```

---

### Related

- Status tables: [`TECHNICAL_REFERENCE.md#functional-specification-newvision`](#functional-specification-newvision) Phase 4
- Technical routes: [`TECHNICAL_REFERENCE.md#project-map`](#project-map)

---

<a id="api-reference"></a>

## API reference

**Handover:** Mode A, **2026-09-16**.  
**Global prefix:** `/api` ([`configure-app.ts`](../backend/src/configure-app.ts): `setGlobalPrefix('api')`).

**Swagger:** `GET /api/docs` when [`swaggerEnabled()`](../backend/src/configure-app.ts) is true (`SWAGGER_ENABLED=true`, or non-production default). Render sets `SWAGGER_ENABLED=false`.

**Complete route list (283 handlers):** [`docs/handoff/api-routes-index.md`](./handoff/api-routes-index.md) (generated from controllers; regenerate via `node docs/handoff/extract-api-routes.mjs`).

---

### Authentication mechanism (all protected routes)

| Mechanism | Detail | Source |
|-----------|--------|--------|
| Access token | `Authorization: Bearer <jwt>` | [`jwt.strategy.ts`](../backend/src/auth/jwt.strategy.ts) |
| Refresh | httpOnly cookie `nv_refresh`, path `/api/auth` | [`refresh-cookie.ts`](../backend/src/auth/refresh-cookie.ts) |
| Public routes | `@Public()` on handler/class | [`jwt-auth.guard.ts`](../backend/src/common/guards/jwt-auth.guard.ts) |
| Roles | `@Roles()` + `RolesGuard` | [`roles.guard.ts`](../backend/src/common/guards/roles.guard.ts) |
| Tenant | `TenantInterceptor` | [`tenant.interceptor.ts`](../backend/src/tenancy/tenant.interceptor.ts) |
| Plan modules | `ModulesGuard` | [`modules.guard.ts`](../backend/src/tenancy/modules.guard.ts) |

---

### Controller summary

| Base path | Controller | Approx. handlers |
|-----------|------------|------------------|
| `/api/auth` | `auth/auth.controller.ts` | 15 |
| `/api/assets` | `assets/assets.controller.ts` | 16 |
| `/api/tickets` + related | `tickets/tickets.controller.ts` | 44 |
| `/api/chat` | `chat/chat.controller.ts` | 28 |
| `/api/dashboard` | `dashboard/dashboard.controller.ts` | 9 |
| `/api/purchase-*`, `/api/vendors`, `/api/vendor-contracts`, `/api/procurement` | procurement controllers | 45+ |
| `/api/public/assets` | `public-assets/public-assets.controller.ts` | 4 (**Public**) |
| `/api/email-in` | `tickets/email-inbox.controller.ts` | 5 (webhook **Public** with secret) |
| `/api/health` | `health/health.controller.ts` | 1 (**Public**) |
| `/api/tenant`, `/api/platform/tenants` | `tenancy/tenant.controller.ts` | 10 |

See generated index for every `METHOD` + `PATH`.

---

### Representative endpoint table (pattern)

Full 283-row table with `CALLED FROM` per row would duplicate Swagger; below shows **shape** for key domains. Auth = Bearer JWT unless noted.

| METHOD | PATH | CALLED FROM | PURPOSE | AUTH | ERROR HANDLING |
|--------|------|-------------|---------|------|----------------|
| POST | `/api/auth/login` | `authProvider.login` | Issue access token + refresh cookie | **Public** | 401 invalid; 429 rate limit ([`login-rate-limit.ts`](../backend/src/auth/login-rate-limit.ts)) |
| POST | `/api/auth/signup` | `pages/signup.tsx` (page **REFERENCED**) | New tenant + admin | **Public** | Validation 400 |
| GET | `/api/auth/me` | Refine `getIdentity` | Current user + tenant | JWT | 401 |
| GET | `/api/assets` | Asset list dataProvider | Paginated assets | JWT + scope | 403 |
| POST | `/api/assets/:id/assign` | Asset show actions | Assign to employee | JWT + `asset:assign` | 400 transition/validation |
| GET | `/api/dashboard/metrics` | Dashboard | KPI cards | JWT | 403 |
| GET | `/api/asset-requests` | Requests list | Scoped requests | JWT | 403 |
| PATCH | `/api/asset-requests/:id/review` | Manager approve/reject | Status pending→approved/rejected | JWT + manager scope | 400 if not pending |
| GET | `/api/tickets` | Ticket list | Helpdesk queue | JWT | 403 |
| POST | `/api/email-in/webhook` | External mail relay | Ingest RFC822 | **Public** + `X-Email-Ingest-Secret` | 401 bad secret |
| GET | `/api/public/assets/:code` | `/scan/:code` page | Public asset card | **Public** | 404 |

List endpoints use `_start`, `_end`, `_sort`, `_order`, `q` via [`common/query.ts`](../backend/src/common/query.ts) and Refine [`dataProvider.ts`](../frontend/src/providers/dataProvider.ts).

---

### External integrations

| Integration | Env names | Entry |
|-------------|-----------|--------|
| Resend | `RESEND_API_KEY`, `MAIL_FROM` | [`mailer.service.ts`](../backend/src/notifications/mailer.service.ts) |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | same |
| IMAP ingest | `IMAP_HOST`, `IMAP_USER`, `IMAP_PASS`, `IMAP_PORT`, `IMAP_SECURE`, `IMAP_MAILBOX` | [`email-inbox.service.ts`](../backend/src/tickets/email-inbox.service.ts) |
| Ingest webhook | `EMAIL_INGEST_SECRET` | `POST /api/email-in/webhook` |
| Outbound webhooks | per-endpoint secret | [`webhooks.service.ts`](../backend/src/webhooks/webhooks.service.ts) — `asset.created`, `asset.status_changed` |
| QR / links | `PUBLIC_APP_URL` | [`scan-url.ts`](../backend/src/common/scan-url.ts) |

---

### Hard-coded URLs and environment sensitivity

| URL / pattern | Where | Sensitivity |
|---------------|-------|-------------|
| `http://localhost:5173` | Default `PUBLIC_APP_URL`, CORS, QR | Dev default |
| `http://localhost:3000/api` | Frontend `VITE_API_URL` default | Dev |
| Ticket links in email | `PUBLIC_APP_URL` + `/tickets/show/:id` | [`ticket-email-templates.ts`](../backend/src/notifications/ticket-email-templates.ts) |
| Render hostnames | `render.yaml` service names | Production — set `VITE_API_URL` on web service rebuild |

---

### WebSocket

Chat: Socket.IO via [`chat.gateway.ts`](../backend/src/chat/chat.gateway.ts); CORS origins from `CORS_ORIGIN` (same as REST).

---

<a id="technical-change-guide"></a>

## Technical change guide

**Handover:** Mode A, **2026-09-16**.

### Add Nest module + API + Prisma model

1. Edit [`schema.prisma`](../backend/prisma/schema.prisma) (+ `tenantId` if tenant data).
2. `npx prisma migrate dev` (local) / `migrate deploy` (CI/prod).
3. Add `*.module.ts`, `*.service.ts`, `*.controller.ts`, `dto.ts`.
4. Import in [`app.module.ts`](../backend/src/app.module.ts).
5. Add `PermissionKey` + `ROLE_PERMISSIONS` in [`permissions.ts`](../backend/src/common/rbac/permissions.ts).
6. Mirror in [`frontend/src/access.ts`](../frontend/src/access.ts).
7. Tests: `npm test`, `npm run test:e2e`.

### Add Refine page + route

1. Page under `frontend/src/pages/`.
2. Lazy import + `<Route>` in [`App.tsx`](../frontend/src/App.tsx).
3. `resources` entry + `navForRole` + `RoleRouteGuard` resource key.
4. `npm run typecheck && npm run build`.

### Add environment variable

Backend: code + [`backend/.env.example`](../backend/.env.example) + `docker-compose.yml` + `render.yaml`.  
Frontend: `VITE_*` + rebuild static site.

### Schema change

`migrate dev` → commit migration → `migrate deploy` on deploy. No down migrations in prod without restore.

### Add tests

- Unit: `src/**/*.spec.ts` with `@jest/globals`.
- API e2e: `backend/test/*.e2e-spec.ts`, DB `newvision_test`.
- Playwright: `frontend/e2e/`, API on :3000 seeded.

### Checklist

- [ ] `npm run lint` / typecheck both packages  
- [ ] `permissions.ts` ↔ `access.ts`  
- [ ] No secrets in commit  
- [ ] Update functional spec if behavior changed

---

<a id="setup-and-deployment"></a>

## Setup and deployment

**Handover:** Mode A (fresh), generated **2026-09-16**.  
**Sources:** [`README.md`](../README.md), [`docker-compose.yml`](../docker-compose.yml), [`backend/docker-entrypoint.sh`](../backend/docker-entrypoint.sh), [`render.yaml`](../render.yaml), [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

---

### Phase 11 verification log (executed 2026-09-16)

| Step | Command / action | Result |
|------|------------------|--------|
| Backend typecheck | `cd backend; npm run typecheck` | **PASS** |
| Backend unit tests | `cd backend; npm test` | **PASS** — 34 suites, 119 tests |
| Frontend typecheck | `cd frontend; npm run typecheck` | **PASS** |
| Frontend production build | `cd frontend; npm run build` | **PASS** (~20s) |
| API health | `curl -m 5 http://localhost:3000/api/health` | **VERIFIED WORKING** — HTTP 200, `{"ok":true,"db":"up","region":"singapore",...}` |
| Docker Compose full stack | `docker compose up --build` | **NOT VERIFIED** — not executed (long-running; documented path below) |
| Backend API e2e | `npm run test:e2e` | **NOT VERIFIED** — requires Postgres `newvision_test` + migrations (CI recipe) |
| Playwright | `cd frontend; npm run test:e2e` | **NOT VERIFIED** — requires seeded API on :3000 |

**Windows:** Use `;` between commands in PowerShell, not `&&`.

**Divergence:** None observed between README quick-start and `docker-compose.yml` env for local URLs (`5173` / `3000`).

---

### Local setup (Docker — recommended)

Requires Docker Desktop.

```bash
docker compose up --build
```

| Service | URL | Notes |
|---------|-----|--------|
| Frontend | http://localhost:5173 | `VITE_API_URL=http://localhost:3000/api` in compose |
| Backend | http://localhost:3000/api | Global prefix `api` |
| Swagger | http://localhost:3000/api/docs | When `SWAGGER_ENABLED` true (non-prod default) |
| Postgres | localhost:5432 | `newvision` / `newvision` / `newvision` |

**Entrypoint** ([`backend/docker-entrypoint.sh`](../backend/docker-entrypoint.sh)): `prisma migrate deploy`; if `SEED_ON_START=true`, runs `npm run seed` (compose sets `SEED_IF_EMPTY=true`).

After first boot, set `SEED_ON_START: "false"` in compose if you need to preserve data across restarts.

Demo account emails are listed in README (password not repeated here).

---

### Local setup (without Docker)

**Node 24.16+**, **PostgreSQL 16**, databases `newvision` and `newvision_test` (for API e2e).

### Deployment target (undecided)

Production hosting is **not finalized**. `render.yaml` is a **legacy / unconfirmed** Render blueprint — do not treat it as the chosen go-live path until Satyam decides between **Render** and **Hostinger VPS**. No deploy work should be assumed until that decision and a matching runbook exist (see Hostinger guide in `docs/` when using VPS).

#### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run start:dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

### Environment precedence

1. Shell / process environment  
2. `docker-compose.yml` service `environment`  
3. Render dashboard / `render.yaml` `envVars` (production)  
4. Defaults in code (e.g. `CORS_ORIGIN` → `http://localhost:5173` in [`configure-app.ts`](../backend/src/configure-app.ts))

Full name inventory: [Developer handover](#developer-handover-newvision) (Phase 10).

---

### CI/CD

**CI** ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)):

- **backend** — Postgres 16, `npm ci`, prisma generate, lint, typecheck, unit tests, `test:e2e`
- **frontend** — lint, typecheck, build
- **e2e** — backend build/seed/boot, Playwright vs Vite

**Render** ([`render.yaml`](../render.yaml)): `newvision-db`, `newvision-api` (Docker, health `/api/health`), `newvision-web` (static). Region Singapore.

**Keep-alive:** [`.github/workflows/keep-alive.yml`](../.github/workflows/keep-alive.yml) pings health on a schedule.

---

### Rollback

- **Application:** redeploy previous Render commit / image.
- **Database:** forward-only migrations; restore from backup per [`TECHNICAL_REFERENCE.md#backup-and-restore-drill`](#backup-and-restore-drill) if needed.

---

### Related

- [`TECHNICAL_REFERENCE.md#developer-handover-newvision`](#developer-handover-newvision)
- [`TECHNICAL_REFERENCE.md#troubleshooting`](#troubleshooting)

---

<a id="backend-end-to-end-tests"></a>

## Backend end-to-end tests

### Node.js (Windows)

Use **Node ≥ 24.16.0** (24.x LTS). On **24.15.0** + libuv 1.51.0 this host hit silent native crashes (`0xC0000409`) during full Jest e2e and long-lived `node dist/main.js` — see [Node on Windows](#nodejs-on-windows-stability) ([#63620](https://github.com/nodejs/node/issues/63620), [#62260](https://github.com/nodejs/node/issues/62260)).

Confirm before e2e or Playwright:

```bash
node -v   # expect v24.16.0 or newer
```

### Database

E2e uses PostgreSQL database `newvision_test` (override with `DATABASE_URL` / `DATABASE_URL_TEST`). `test/global-setup.ts` creates the DB if missing and runs `prisma migrate deploy` once per Jest invocation.

Each spec file calls `seedCore(prisma, app)` in `beforeAll`, which:

1. `TRUNCATE … CASCADE` on core tables (via a dedicated `pg` client).
2. Inserts the shared NewVision fixture (tenant 1, five role users, locations, categories).
3. Calls `RbacService.refreshFromDatabase()` so in-process permission caches match the new rows.

**Always pass the Nest `app` into `seedCore`.** Without it, `RbacService` keeps the snapshot from `onModuleInit` (before truncate), which causes `401`/`403` flakes when multiple spec files run in one Jest process.

### Running tests

**Before backend e2e:** stop any dev API on port **3000** (`node dist/main.js` or Docker). A live API plus Jest both hitting Postgres can cause deadlocks, `401`s, and flaky `seedCore` runs. Playwright is the opposite — it **needs** one API on `:3000` with seeded `newvision`.

From `backend/`:

```bash
npm run test:e2e
```

This runs Jest with `--runInBand` and `maxWorkers: 1` so spec files never share the DB concurrently.

Optional heap headroom on Windows:

```bash
set NODE_OPTIONS=--max-old-space-size=4096
npm run test:e2e
```

Single file:

```bash
npx jest --config ./test/jest-e2e.js --runInBand test/prompt20-auth-users-rbac.e2e-spec.ts
```

### Playwright (frontend)

From `frontend/`:

1. **One** API process on port **3000** with seeded `newvision` DB (`cd backend && npm run build && npm run seed && ALLOW_DEMO_LOGINS=true node dist/main.js`). If the port is already in use, do not start a second server — the background task will exit with code 1 even after “successfully started”.
2. `npx playwright install chromium` (once per machine/CI image).
3. `npm run test:e2e` (starts Vite on 5173 via `playwright.config.ts`, or reuses an existing `npm run dev` on 5173). If the embedded Vite process dies mid-run (`ERR_CONNECTION_REFUSED` on 5173), start `cd frontend && npm run dev` in a separate terminal and re-run Playwright.

**Baseline (backend):** with Postgres up, **no** API on `:3000`, then `NODE_OPTIONS=--max-old-space-size=4096 npm run test:e2e` — **206/206** tests, **37/37** suites, exit **0**, ~**8.4 min** (502 s wall clock, Node **24.19.0**, 2026-09-17 evening). If Docker is offline, e2e cannot run (`P1001`).

**Baseline (Playwright):** API `:3000` + DB seeded, `cd frontend && npm run test:e2e` — **102/102** passed, exit **0**, ~**8.8 min** (Node **24.19.0**, 2026-09-18 local).

### CI guidance

Prefer the same single-process command above on a clean `newvision_test` database. If a runner cannot guarantee serial execution, run one Jest process per spec file and fail the job if any file exits non-zero.

---

<a id="manual-walkthrough-local-sign-off"></a>

## Manual walkthrough (local sign-off)

**Date:** 2026-09-17  
**Stack:** API `:3000`, frontend `:5173`, seeded `newvision`, `ALLOW_DEMO_LOGINS=true`, password `Password123!`  
**Helper:** `node scripts/manual-walkthrough-local.mjs` (API flows; re-run when API is up)

This pass used **real UI sessions** (browser-driven Playwright suite as the interactive check) plus **HTTP walkthrough** for Entra/mock IdP and ticket email ingest. Observations below are qualitative, not “all green” boilerplate.

---

### 1. Mock Microsoft sign-in + JIT provisioning

- **Login screen:** “Sign in with Microsoft” is visible; password form remains the default for demo tenants.
- **API path (verified live):** Three-hop redirect through `/api/auth/entra/login` → mock IdP authorize → callback → `/auth/entra/complete` handoff → `POST /api/auth/entra/exchange` returned **200** for `jit.newhire@newvision.local` with role **EMPLOYEE** and department **Engineering** (same chain as `entra-auth.e2e-spec.ts`).
- **UX note:** Completing Entra in the browser briefly lands on `/auth/entra/complete` before the SPA stores the session; acceptable but easy to mistake for a stall on slow laptops.

### 2. Super Admin / IT Admin — custom role + API boundaries

- **UI:** Settings → Custom roles → create role with a small permission set → assign to a user on Settings → Users (custom role dropdown). Checklist UI is clear; saving shows success toast.
- **API (authoritative):** `custom-role-rbac.e2e-spec.ts` — user with only `asset:read` gets **200** on `GET /api/assets`, **403** on `POST /api/assets` and **403** on `GET /api/support-tickets/staff`. System-role users unchanged.
- **Rough edge:** Creating a user with a custom role in one step requires **create user**, then **edit user** to set `customRoleId` (create DTO has no custom-role field).

### 3. Ticket from web UI

- **Employee:** My IT → “Raise a ticket” (or bottom nav **Tickets** at 390px) → blank + template flows work; success toast and ticket visible in list (`tickets.spec.ts` exercised the same paths interactively).
- **Staff:** IT Admin queue, comments, time log, and export feel responsive; canned macros behave as expected.

### 4. Ticket via mocked email + threaded reply

- **Pipeline:** `POST /api/email-in/ingest` creates a ticket from `employee@newvision.local`; second ingest with `inReplyTo` / `references` attaches to the same thread (`email-in.e2e-spec.ts` pattern). Console mailer logs outbound staff replies when SMTP is unset.
- **UX note:** Employees do not see email thread metadata in the UI—only the ticket conversation—which matches design but can confuse testers expecting “email headers” on the card.

### 5. Large Excel import

- **UI:** Settings → Import jobs → upload CSV/XLSX → dry-run shows row counts and error buckets; commit progresses in-app (`governance.spec.ts` dry-run).
- **Scale:** `node backend/scripts/benchmark-import.mjs` — **100,000 rows / ~178 ms** parse on dev hardware (not re-uploaded through the browser in this pass; **500 MB** tabular upload cap applies in UI).

### 6. Audit cycle + QR scan exception

- **UI:** Staff scan page (`/scan/:code`) → confirm location → stamp audit (`prompt35-scan-audit.spec.ts`).
- **Cycle linkage:** With an **in_progress** audit cycle, `stamp-audit` / audit-by-code records a physical scan via `AuditCyclesService.recordPhysicalScan()`; wrong-location or missing asset surfaces as a **finding/exception** on the cycle (API covered in `phases-11-14.e2e-spec.ts`).
- **Gap:** No scheduled email reminder when a cycle is overdue (still open; see checklist).

### 7. Mobile employee shell (390px)

- **Fixed this pass:** Header action row (Help/Keys) overflowed by **15px**; `EmployeeBottomNav` was implemented but **not mounted** in `App.tsx`. Wired bottom nav + phone header CSS → `scrollWidth === innerWidth` at 390px (`prompt38-join-kit.spec.ts`).
- **UX:** Bottom nav (Home / Kit / Tickets / Request) is easier than the hamburger for employees; Help/Keys hidden on narrow header—employees still have Help via `?` shortcut.

### 8. General rough edges (non-blocking)

- Asset list row click vs assignee link is easy to mis-click (a11y test now opens show page via API id).
- Save named view modal needed Ant Design `Form` submit so Playwright `fill` enables **Save view** (`governance.spec.ts`).
- After long Playwright runs, restart API if `ECONNREFUSED` before re-running the manual API script.

---

Re-run automation: `TECHNICAL_REFERENCE.md#backend-end-to-end-tests` (backend **206/206**, Playwright **102/102** as of this sign-off).

---

<a id="newvision-asset-manager-completion-checklist-verified-2026-09-17"></a>

## NewVision Asset Manager — Completion checklist (verified 2026-09-17)

Detail: [`PHASE_LOG.md`](../PHASE_LOG.md). Legend: `[x]` verified · `[~]` partial · `[ ]` open · `[!]` Satyam / production only

### Phase 1–5
- [x] Hardening, Entra + JIT, MFA transition flag, tenancy fail-closed.
- [x] E2E isolation — `seedCore(prisma, app)` + RBAC refresh; `maxWorkers: 1` (`TECHNICAL_REFERENCE.md#backend-end-to-end-tests`).
- [x] **Permission-based API auth** — `RolesGuard` + `route-permissions.generated.ts`; system roles unchanged; custom roles use `effectivePermissions()` (`custom-role-rbac.e2e-spec.ts` **3/3**).
- [x] Custom roles CRUD, permission checklist UI, user assignment, audit on role/custom changes.
- [x] `INITIAL_SUPER_ADMIN_EMAILS` bootstrap + unit tests.

### Phase 6
- [x] In-app notification matrix (`ticket-notifications.e2e-spec.ts`).
- [x] Email lifecycle matrix (`ticket-emails.e2e-spec.ts` incl. reopen).
- [x] Email-in ingest + reply (`email-in.e2e-spec.ts`).

### Phase 7
- [x] Decision doc (`TECHNICAL_REFERENCE.md#large-import-export-phase-7`); in-process jobs acceptable.
- [x] `parseCsvStreaming` + `forEachTabularRow` (CSV + XLSX row iteration); import create uses streaming sample/count; commit uses batched import (250-row chunks).
- [x] Benchmark **100,000 rows / 178 ms parse** (`scripts/benchmark-import.mjs`, ~4.96 MB CSV) — live run 2026-09-17.
- [~] Duplicate scan still materializes mapped rows once per job (upload cap **500 MB**; commit path still loads the full file into memory — practical limit is instance RAM, not the cap alone).

### Phase 8
- [x] `POST /auth/signup` removed; `provisionTrialTenant()`; `signup.tsx` / `trust.tsx` removed.
- [x] Root doc archive (`docs/archive/`).
- [x] **Large files kept intentionally** — `tickets.service.ts` / `ChatPage.tsx`; rationale in [Technical change guide](#technical-change-guide) (Phase 8 polish entry).
- [x] README/DECISIONS touched this round.

### Phase 9 — validation (live)
- [x] Unit **153/153** (`npm test`, ~20 s, 2026-09-17).
- [x] Backend e2e **206/206**, **37/37** suites, exit **0**, ~**8.4 min** — run with **no** dev API on `:3000` (`NODE_OPTIONS=--max-old-space-size=4096 npm run test:e2e`, Node **24.19.0**).
- [x] Playwright **102/102**, exit **0**, ~**8.8 min** — API on `:3000` + seeded DB (2026-09-18).
- [x] Manual walkthrough notes — `TECHNICAL_REFERENCE.md#manual-walkthrough-local-sign-off` (2026-09-17 sign-off).

### Phase 10
- [x] Graceful shutdown, HTTP request log, import upload rate limit.
- [x] Docs: `TECHNICAL_REFERENCE.md#database-connection-pool-phase-10`, `TECHNICAL_REFERENCE.md#cors-and-csp-phase-10`, `TECHNICAL_REFERENCE.md#observability-phase-10`, `TECHNICAL_REFERENCE.md#render-deploy-rollback-phase-10`.
- [x] `scripts/load-test-health.mjs`.
- [x] Sentry packages + `instrument.ts` (enabled when `SENTRY_DSN` set).
- [x] Slow-query logging **off by default** — documented in `.env.example` / `TECHNICAL_REFERENCE.md#observability-phase-10`.

### Phase 11
- [x] Offboard checklist auto-create; SLA escalation cron; ticket → `#helpdesk` chat line.
- [x] Warranty/contract reminder crons (existing services).
- [x] **Scheduled reports** — `ScheduledReportsService` (weekly cron, in-app + email summary).
- [~] **KB / license compliance engine descoped** — use in-app Help (`frontend` help site) + ticket/procurement flows; no separate KB microservice (see [Known issues](#known-technical-issues-and-tech-debt)).

### Phase 12
- [x] `AuditCycle` + findings API; Settings UI; CSV export.
- [x] **Scan ↔ cycle** — `stampAudit` / `audit-by-code` call `AuditCyclesService.recordPhysicalScan()` for open `in_progress` cycles.
- [x] Scheduled cycle reminder emails — `AuditCycleReminderService` (daily cron for long-running `in_progress` cycles).

### Phase 13
- [x] Pilot plan, feedback audit, bootstrap emails, first-run → Getting Started.
- [x] Import `validateOnly` on commit; asset depreciation on GET + UI fields.

### Phase 14
- [x] Clients, VDI, assignments API; ticket client/VDI fields; `tickets-by-client` report; `/clients` UI.
- [x] Ticket category `vdi` in seed/provision catalog.

<a id="whats-left-before-real-go-live"></a>

### What's left before real go-live `[!]`

Local engineering gate (unit **153/153**, e2e **206/206**, Playwright **102/102** as of **2026-09-18** gap-fix pass) is green; items below still require Satyam / production environment.

- [!] **Microsoft Entra** — app registration, redirect URIs, client secret/cert, tenant ID, Conditional Access; set `MS_*` / `ENTRA_*` per `TECHNICAL_REFERENCE.md#mfa-transition-local-totp-entra-conditional-access` and `TECHNICAL_REFERENCE.md#entra-jit-eligibility-microsoft-side-setup` (local mock IdP is not production).
- [!] **Helpdesk mailbox** — real IMAP/SMTP or Graph inbox for `email-in`; SPF/DKIM/DMARC for outbound ticket mail.
- [!] **Hostinger VPS (target)** — production deploy is **not** Render for this project; `render.yaml` / Render rollback docs are **legacy reference** until a Hostinger runbook lands. Set `DATABASE_URL`, `JWT_SECRET`, `INITIAL_SUPER_ADMIN_EMAILS`, `CORS_ORIGIN`, `PUBLIC_APP_URL`, file storage, TLS, backup/restore (`TECHNICAL_REFERENCE.md#newvision-it-admin-pilot-rollout-plan`, `TECHNICAL_REFERENCE.md#render-deploy-rollback-phase-10` for pattern only).
- [!] **Entra env** — `backend/.env` has **no** `MS_*` / `ENTRA_*` yet; mock IdP only until app registration + secrets are added.
- [!] **CDN / TLS** — production SPA host + API TLS; CSP aligned with `TECHNICAL_REFERENCE.md#cors-and-csp-phase-10`.
- [!] **Optional:** `SENTRY_DSN`; durable import queue (Redis/worker) if imports exceed single-process limits; audit-cycle reminder emails.

---

<a id="known-technical-issues-and-tech-debt"></a>

## Known technical issues and tech debt

**Handover:** Mode A, **2026-09-16**.

| ID | Severity | Issue | Evidence |
|----|----------|-------|----------|
| K1 | **RESOLVED** | `/signup` and `/trust` removed | `signup.tsx` / `trust.tsx` deleted; no routes in `App.tsx` |
| K2 | **MEDIUM** | Help articles vs login trial signup copy | `help/articles.ts` vs `login.tsx` |
| K3 | **MEDIUM** | Duplicated RBAC (`permissions.ts` / `access.ts`) | Must update both for new keys |
| K4 | **LOW** | Historical note mentioned Nest 12; repo uses Nest 11 CJS | `package.json` |
| K5 | **OBSERVATION** | Super Admin MFA prod gate commented out | `auth.service.ts` ~310–312 |
| K6 | **OBSERVATION** | Backend Docker image includes dev deps + `src` for seed | DECISIONS Phase 1 |
| K7 | **LOW** | No `TODO`/`FIXME` in `backend/src` grep | — |

### RBAC drift (2026-09-16)

`permissions.ts` and `access.ts` **IT_ADMIN** rows match (no `user:manage`, no `asset:delete`). No other key drift detected.

Functional gaps: see [Known issues](#known-technical-issues-and-tech-debt) and pilot checklist below (no separate gaps file).

---

<a id="troubleshooting"></a>

## Troubleshooting

**Handover:** Mode A, **2026-09-16**.

| Symptom | Likely area | File / log | Next step |
|---------|-------------|------------|-----------|
| 401 after idle | JWT expired | `JWT_EXPIRES_IN`, refresh cookie | Re-login; check `nv_refresh` on `/api/auth` |
| 429 on login | Rate limit | `login-rate-limit.ts` | Wait 15 minutes |
| CORS error | Origin mismatch | `CORS_ORIGIN`, Vite URL | Align exact origin |
| Empty data wrong tenant | Tenancy | `tenant.interceptor.ts` | Verify user `tenantId` |
| 403 module not available | Plan / trial | `modules.guard.ts`, `plans.ts` | Check tenant status/modules |
| Swagger 404 prod | Flag | `SWAGGER_ENABLED=false` | Use local or enable temporarily |
| Prisma errors | `DATABASE_URL` | `prisma.service.ts` | Postgres up; `migrate deploy` |
| Seed wiped data | `SEED_ON_START` | `docker-entrypoint.sh` | Set `SEED_ON_START=false` |
| Mail not sent Render Free | SMTP blocked | Use `RESEND_API_KEY` | README Render section |
| `/signup` 404 | Missing route | `App.tsx` | Add Route or remove login link |
| Slow `/api/health` | Local load / Docker | — | Retry with `curl -m 10` |
| PowerShell `&&` fails | Shell | — | Use `;` |

**Health:** `GET /api/health` → `{ ok, db, region, residency }`.

See [`TECHNICAL_REFERENCE.md#setup-and-deployment`](#setup-and-deployment) Phase 11 log.

---

<a id="backup-and-restore-drill"></a>

## Backup and restore drill

This is the ops runbook. The app does not ship a backup UI.

### What to back up

- **Postgres** (`newvision` database): all tenant data. Row-level `tenant_id` is the isolation key.
- **Secrets**: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PLATFORM_ADMIN_SECRET`, SMTP/Resend keys, `BOOTSTRAP_ADMIN_PASSWORD`. Not in git.
- **Uploaded files** if you later move off `bytea` (import jobs currently store files in Postgres).

### Backup (Render Postgres)

1. Dashboard → the `newvision-db` instance → **Backup** (or `pg_dump` from a machine allowed by `ipAllowList`).
2. Save the dump **outside** Singapore if you have a residency requirement; the demo host is Singapore.

```bash
pg_dump "$DATABASE_URL" --format=custom --file=newvision-$(date +%Y%m%d).dump
```

### Restore drill (do this on a **copy**, not production, the first time)

1. Provision a scratch Postgres 16.
2. `pg_restore --clean --if-exists --dbname="$SCRATCH_DATABASE_URL" newvision-YYYYMMDD.dump`
3. Point a throwaway API instance at the scratch URL.
4. `GET /api/health` must return `{ ok: true, db: "up" }`.
5. Sign in as a known Super Admin and open one asset, one employee, one ticket.
6. Record the time taken. Target: restore verified within the RTO you put in the (external) SLA.

### After restore

- Rotate `JWT_SECRET` if the dump could have leaked.
- Confirm `tenants` rows and that tenant A still cannot `GET /api/assets/:id` of tenant B (see `backend/test/prompt37-tenancy.e2e-spec.ts`).

---

<a id="render-deploy-rollback-phase-10"></a>

## Render deploy rollback (Phase 10)

1. In Render dashboard → **newvision-api** (or your service name) → **Deploys**.
2. Pick the last known-good deploy → **Rollback to this deploy**.
3. Confirm health: `GET /api/health` returns `ok` and database connectivity.
4. If a bad migration shipped: **do not** roll forward blindly — restore DB from backup/PITR first, then roll back the app to the matching migration era.
5. Post-incident: note deploy id and time in internal ops channel; append summary to `PHASE_LOG.md` if code-related.

---

<a id="newvision-it-admin-pilot-rollout-plan"></a>

## NewVision IT Admin — pilot rollout plan

Internal single-tenant pilot (NewVision Softcom). Not a multi-customer SaaS launch.

### Week 0 — prerequisites (Satyam)

- Entra app registration + `MS_*` on Render; optional `MS_APPROVED_SECURITY_GROUP_ID`.
- Helpdesk mailbox IMAP/SMTP on Render.
- `INITIAL_SUPER_ADMIN_EMAILS` for first real Super Admins; `ALLOW_DEMO_LOGINS=false` in production.
- `ALLOW_SIGNUP` unset/false (signup disabled for internal tool).

### Week 1 — IT core

- IT Admin + Support validate assets, employees, tickets, email ingest on a **copy** of real export data (dry-run import).
- Run QA gate: backend e2e **206/206**, Playwright **102/102** on staging.

### Week 2 — managers & employees

- Enable My IT / manager approvals for one department.
- Knowledge base articles reviewed; ticket templates aligned with helpdesk.

### Week 3 — procurement (if enabled)

- Vendor + requisition smoke test with finance.

### Week 4 — cutover

- Freeze legacy spreadsheet; production import; deactivate demo Super Admin if redundant.
- Monitor audit log + feedback entries (`/api/feedback` → audit `Feedback` rows).

### Rollback

- Render deploy rollback per `TECHNICAL_REFERENCE.md#render-deploy-rollback-phase-10`.
- Postgres PITR per hosting plan (confirm retention outside this repo).

---

<a id="cors-and-csp-phase-10"></a>

## CORS and CSP (Phase 10)

### CORS

`configure-app.ts` reads `CORS_ORIGIN` (comma-separated). Production should list only the SPA origin(s), e.g. `https://app.example.com`. Credentials are enabled for cookie refresh flows.

### API Helmet CSP

The API sets a minimal CSP for JSON responses (`default-src 'none'`). The **browser SPA** must set its own CSP on static hosting (Vite build). Recommended production headers on the frontend CDN:

- `Content-Security-Policy`: restrict `script-src` to your bundle host; allow `connect-src` to the API origin and WebSocket host.
- `X-Frame-Options: DENY` or `frame-ancestors 'none'`.

### Sentry

Placeholder: set `SENTRY_DSN` in the API when ready; wire `@sentry/node` in `main.ts` behind `if (process.env.SENTRY_DSN)` (not enabled in local-only builds).

---

<a id="database-connection-pool-phase-10"></a>

## Database connection pool (Phase 10)

Prisma uses the driver adapter (`@prisma/adapter-pg`) with `DATABASE_URL`. Tune Postgres pool size via URL query params, for example:

`postgresql://user:pass@host:5432/newvision?connection_limit=10&pool_timeout=20`

- **Render / small instances:** `connection_limit=5–10` per API instance.
- **Long imports:** jobs run in-process; avoid raising `connection_limit` above Postgres `max_connections` divided by services.
- **Slow queries:** enable `log` in staging with `DEBUG=prisma:query` briefly; add indexes before raising pool size.

Restore drills: see `TECHNICAL_REFERENCE.md#backup-and-restore-drill` and `TECHNICAL_REFERENCE.md#render-deploy-rollback-phase-10`.

---

<a id="large-import-export-phase-7"></a>

## Large import / export (Phase 7)

### Queue model (decision)

`ImportJobsService` persists job rows and processes them with `setImmediate` on the API process. That is **acceptable** for NewVision’s single Render web service today: no Redis/Bull dependency, survives restarts only as “queued/failed” rows, and matches internal-tool scale.

Revisit a durable queue (SQS, BullMQ, etc.) if imports routinely exceed ~15 minutes or multiple workers run importers in parallel.

### Current limits

- Tabular uploads use `assertTabularUpload` and multer `limits.fileSize` — both **`TABULAR_UPLOAD_MAX_FILE_BYTES` (500 MB)** — plus extension allowlist (`.csv`/`.xls`/`.xlsx`). General attachments stay at 8 MB (`UPLOAD_MAX_FILE_BYTES`). No extra Nest/Express JSON body limit applies to multipart uploads; no in-repo reverse-proxy body cap (configure at host if needed).
- Full file is buffered in memory (`file.buffer` / `parseTabular`) before commit — fine for tens of thousands of rows on a 2GB instance; a **500 MB** sheet can OOM before the cap is the binding constraint.

### Streaming (partial)

- `parseCsvStreaming()` in `import-export/parse.ts` — step callback for CSV; XLSX still loads via ExcelJS.
- Commit path still materialises mapped rows for duplicate scan; wire streaming through `ImportJobsService.process` before raising upload caps.

### Benchmark (local, Windows host)

Command: `cd backend && node scripts/benchmark-import.mjs` (optional `BENCH_ROWS=100000`).

| Rows | Bytes | parseMs |
|------|-------|---------|
| 100,000 | 4,955,598 | **166** |

### Remaining

1. Env `IMPORT_MAX_UPLOAD_MB` for streaming-only jobs.
2. End-to-end commit benchmark with DB (not just Papa parse).

---

<a id="observability-phase-10"></a>

## Observability (Phase 10)

- **HTTP request log:** enabled by default (`HTTP` logger). Set `HTTP_REQUEST_LOG=false` to disable.
- **Graceful shutdown:** `enableShutdownHooks()` in `main.ts`.
- **Structured logging:** Nest `bufferLogs`; production can switch to Pino via `@nestjs/platform-fastify` or a custom logger provider later.
- **Sentry:** optional — set `SENTRY_DSN` to enable (`@sentry/nestjs` wired in `instrument.ts` + `SentryModule`). No DSN = no outbound telemetry.
- **Slow SQL:** `PRISMA_SLOW_QUERY_MS` is documented in `.env.example` but **off by default** (pg pool adapter does not expose per-query timings reliably); use external APM or Postgres `log_min_duration_statement` in production.
- **Load test:** run `node scripts/benchmark-import.mjs` from `backend/` and record `parseMs` in `PHASE_LOG.md`.

---

<a id="nodejs-on-windows-stability"></a>

## Node.js on Windows (stability)

### Minimum version

Use **Node.js ≥ 24.16.0** (24.x LTS) on **Windows**, especially build **26200** and similar.

`backend/package.json` and `frontend/package.json` declare `"engines": { "node": ">=24.16.0" }`.

### Why

On **Node 24.15.0** with **libuv 1.51.0**, this project saw intermittent process death with exit code **`3221226505`** / **`0xC0000409`** (`STATUS_STACK_BUFFER_OVERRUN`) — no Nest/Jest stack trace, often no Windows Event Viewer entry:

- [nodejs/node#63620](https://github.com/nodejs/node/issues/63620) — silent `/GS` failure in the Windows **outbound HTTP connect** path under connection churn (e.g. full Jest e2e including `entra-auth.e2e-spec.ts`).
- [nodejs/node#62260](https://github.com/nodejs/node/issues/62260) — same exit code on **Windows 11 26200** in some V8 Maglev scenarios.

**24.16.0+** ships **libuv 1.52.1** with fixes relevant to #63620; newer 24.x LTS builds are preferred.

### Local install

- **System (recommended when you have admin):** upgrade via [nodejs.org](https://nodejs.org/) LTS or `winget upgrade OpenJS.NodeJS.LTS`. Until then, `C:\Program Files\nodejs\node.exe` may still report **v24.15.0**.
- **Per-user (no admin):** official win-x64 zip is already on this machine at  
  `%LOCALAPPDATA%\node-v24.19.0-win-x64` (libuv **1.52.1**). For one PowerShell session:

```powershell
$env:PATH = "$env:LOCALAPPDATA\node-v24.19.0-win-x64;$env:PATH"
node -v   # should show v24.19.0
```

Use that `PATH` for `npm run test:e2e`, `node dist/main.js`, and Playwright — same as a full install, without MSI/admin.

### If crashes persist after upgrade

1. `NODE_OPTIONS=--report-on-fatalerror --report-uncaught-exception --report-dir=./node-reports`
2. Trial `--no-maglev` for V8 (#62260).
3. WER LocalDumps or Procdump on `node.exe`.
4. Prefer **Linux** (Docker/WSL2/CI/Render) for long-running API and full e2e.

---

<a id="entra-jit-eligibility-microsoft-side-setup"></a>

## Entra JIT eligibility (Microsoft-side setup)

Phase 3 auto-creates a local **Employee** login on first successful Microsoft sign-in when the identity passes tenant (and optional group) checks. Nothing here is implemented in code beyond reading env vars — Satyam must configure Entra.

### Security group (optional)

If `MS_APPROVED_SECURITY_GROUP_ID` is set in the backend environment, the ID token must list that group's **object id** in the `groups` claim. Recommended group:

| Field | Value |
|--------|--------|
| Display name | `NewVision-AssetManager-Employees` |
| Type | Security |
| Membership | Users who should access the asset manager |
| Object ID | Copy into `MS_APPROVED_SECURITY_GROUP_ID` |

#### App registration token configuration

1. Open the single-tenant app registration → **Token configuration**.
2. Add optional claim **groups** on the ID token (or configure group overage via Microsoft Graph later — not built in this repo yet).
3. Ensure members of `NewVision-AssetManager-Employees` receive the group id in the token.

If the env var is **unset**, any user in the approved tenant (`MS_TENANT_ID`) may JIT-provision (still **Employee** only).

### Tenant

`MS_TENANT_ID` must match the `tid` claim. JIT users are created in the workspace identified by `ENTRA_JIT_TENANT_SLUG` (default `newvision`).

---

<a id="mfa-transition-local-totp-entra-conditional-access"></a>

## MFA transition: local TOTP → Entra Conditional Access

Phase 4 keeps the existing hand-rolled TOTP path for password logins. Microsoft sign-in can skip the local Super Admin TOTP gate only when Entra Conditional Access already enforced MFA for the session.

### Target state (Microsoft side)

1. Require MFA via a **Conditional Access** policy scoped to this app registration (and optionally to `NewVision-AssetManager-Employees`).
2. Confirm sign-in logs show `multifactor auth` / `mfa` satisfied before enabling the app flag below.

### Application flag

Set `ENTRA_SATISFIES_MFA=true` on the backend **only after** Conditional Access is verified.

- **Microsoft sign-in:** local Super Admin TOTP setup/verify is skipped (MFA is assumed satisfied by Entra).
- **Password sign-in:** unchanged — Super Admin still uses local TOTP when `REQUIRE_SUPERADMIN_MFA` is enforced (default).

Never set `ENTRA_SATISFIES_MFA=true` without Conditional Access — that would weaken Super Admin protection on the Entra path.

---
