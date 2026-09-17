# NewVision — IT Asset Management

Multi-tenant SaaS for IT asset inventory, helpdesk, maintenance, procurement, and internal chat. Each company is an isolated **tenant** (shared PostgreSQL with `tenantId` on operational rows).

- **Frontend:** React 19, TypeScript, Refine, Ant Design, Vite
- **Backend:** NestJS, Prisma, PostgreSQL
- **Auth:** JWT + refresh cookie, five system roles, optional custom roles and Microsoft Entra ID
- **Ops:** Docker Compose locally; [Render Blueprint](render.yaml) for production

---

## Quick start (Docker)

Requires Docker Desktop.

```bash
docker compose up --build
```

| Service  | URL                         |
|----------|-----------------------------|
| Frontend | http://localhost:5173       |
| API      | http://localhost:3000/api   |
| Swagger  | http://localhost:3000/api/docs |

On first boot the backend runs migrations and seeds demo data when `SEED_ON_START=true` (default in `docker-compose.yml`). Set `SEED_ON_START: "false"` after the first run if you want to keep local changes across restarts.

### Demo accounts

Password for all: **`Password123!`**

| Role        | Email                        |
|-------------|------------------------------|
| Super Admin | `superadmin@newvision.local` |
| IT Admin    | `itadmin@newvision.local`    |
| IT Support  | `support@newvision.local`    |
| Manager     | `manager@newvision.local`    |
| Employee    | `employee@newvision.local`   |

---

## Local development (without Docker)

Node **22+** (CI) or **24+** (package engines) and PostgreSQL **16**. Create databases `newvision` and `newvision_test`.

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

---

## Deploy

Use the root [`render.yaml`](render.yaml) Blueprint (Postgres + API + static frontend). Full steps, secrets, and bootstrap admin: **[`docs/TECHNICAL_REFERENCE.md`](docs/TECHNICAL_REFERENCE.md#setup-and-deployment)**.

---

## Testing

**Backend** (from `backend/`):

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

E2e tests need Postgres and `DATABASE_URL_TEST` (see `backend/.env.example`).

**Frontend** (from `frontend/`):

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Playwright expects the API on port 3000 with seeded data; it starts the Vite dev server automatically. CI runs the same checks in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [`docs/TECHNICAL_REFERENCE.md`](docs/TECHNICAL_REFERENCE.md) | Consolidated engineering docs (architecture, API, RBAC, workflows, setup, ops) — use the [table of contents](docs/TECHNICAL_REFERENCE.md#table-of-contents) for section anchors |

PDF handoffs: [`docs/handoff/`](docs/handoff/) (developer + functional spec). User guide: [`docs/user-guide/`](docs/user-guide/).

---

## Project structure

```
IT_ADMIN/
├── backend/           NestJS API, Prisma, Jest
├── frontend/          Vite SPA, Playwright e2e
├── docs/              Product and engineering docs
├── design-reference/  Design tokens + standalone HTML reference
├── docker-compose.yml
├── render.yaml
└── .github/workflows/
```
