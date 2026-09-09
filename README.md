# NewVision — IT Asset Management System

Internal IT asset inventory & management for a company operating across **Pune, Hyderabad, and Bhopal** (~1,250 assets, ~1,180 employees). It replaces spreadsheets: from one place an IT admin can see how many assets exist, who has what, its condition, warranty status, and where each asset is in its lifecycle.

- **Frontend:** React + TypeScript, [Refine](https://refine.dev) + Ant Design (Vite)
- **Backend:** NestJS + TypeScript, PostgreSQL via Prisma
- **Auth:** JWT + role-based access control (5 roles), enforced at the API layer
- **Testing:** Jest (unit + integration/API) and Playwright (end-to-end)
- **Local dev:** Docker Compose (Postgres + backend + frontend)
- **CI:** GitHub Actions — lint, type-check, unit, integration, and Playwright on every push

See [`DECISIONS.md`](./DECISIONS.md) for every judgment call, [`PROGRESS.md`](./PROGRESS.md) for phase-by-phase status, and [`FUTURE_IDEAS.md`](./FUTURE_IDEAS.md) for deliberately out-of-scope ideas.

---

## Quick start (Docker — recommended)

Requires Docker Desktop.

```bash
docker compose up --build
```

This starts three services and, on first boot, the backend automatically applies migrations and seeds realistic demo data:

| Service   | URL                              | Notes                                  |
|-----------|----------------------------------|----------------------------------------|
| Frontend  | http://localhost:5173            | Refine + AntD UI                       |
| Backend   | http://localhost:3000/api        | REST API (`/api/docs` = Swagger)       |
| Postgres  | localhost:5432                   | user/pass/db all `newvision`           |

> **Seeding:** the backend seeds on start when `SEED_ON_START=true` (the default in `docker-compose.yml`). The seed script **resets** demo data on each run. After your first boot, set `SEED_ON_START: "false"` in `docker-compose.yml` if you want to keep changes across restarts. To reseed manually: `docker compose exec backend npm run seed`.

### Demo accounts

All accounts use password **`Password123!`**:

| Role        | Email                          |
|-------------|--------------------------------|
| Super Admin | `superadmin@newvision.local`   |
| IT Admin    | `itadmin@newvision.local`      |
| IT Support  | `support@newvision.local`      |
| Manager     | `manager@newvision.local`      |
| Employee    | `employee@newvision.local`     |

---

## Local development (without Docker)

You need **Node 22+** and a running **PostgreSQL 16**. Create two databases: `newvision` and `newvision_test`.

### Backend

```bash
cd backend
cp .env.example .env         # adjust DATABASE_URL if needed
npm install
npx prisma generate
npx prisma migrate deploy    # apply schema
npm run seed                 # load demo data
npm run start:dev            # http://localhost:3000/api  (Swagger at /api/docs)
```

### Frontend

```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

The frontend reads the API base URL from `VITE_API_URL` (defaults to `http://localhost:3000/api`).

---

## Testing

Run the full suite yourself before considering any phase done — all green is the bar.

### Backend — unit + integration (API) tests

Unit tests cover pure business logic (status-transition rules, RBAC permission checks, warranty date math, asset-code generation). Integration tests hit every API endpoint with at least one happy-path and one failure-path each, against a dedicated `newvision_test` database.

```bash
cd backend
npm run lint          # Biome
npm run typecheck     # tsc --noEmit
npm test              # unit tests
npm run test:e2e      # integration/API tests (needs Postgres reachable)
```

Current status: **49 unit + 47 integration = 96 passing.**

### Frontend — lint, type-check, build

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

### End-to-end (Playwright)

The Playwright suite drives the real UI and covers: **login, create an asset, assign an asset, transfer an asset, global search, CSV import, role-based access control, reporting a repair, downloading reports, saving a filter view, dry-running a mapped import job, HR reconciliation, and the public QR scan page**. It needs the backend running with seeded data on `:3000`; Playwright starts the frontend dev server automatically.

```bash
# 1) In one terminal, run the seeded backend (or `docker compose up backend postgres`)
cd backend && npm run start:dev

# 2) In another terminal, run the e2e suite
cd frontend
npx playwright install chromium   # first time only
npm run test:e2e                  # 22 tests
npm run test:e2e:report           # open the last HTML report
```

Current status: **22 Playwright tests passing** (includes axe-core a11y, help docs, and the asset-request approval flow).

---

## Continuous integration

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs on every push and pull request:

1. **Backend** — `npm ci`, Prisma generate, Biome lint, `tsc` type-check, unit tests, integration/API tests (against a Postgres service container).
2. **Frontend** — lint, type-check, production build.
3. **Playwright e2e** — builds & seeds the backend, boots it, installs Chromium, and runs the browser tests (report uploaded as an artifact).

---

## Project structure

```
IT_ADMIN/
├── backend/                 # NestJS API + Prisma
│   ├── prisma/              # schema, migrations, seed
│   ├── src/                 # modules: auth, assets, employees, locations, ...
│   ├── test/                # Jest integration (e2e API) tests
│   └── Dockerfile
├── frontend/                # Refine + AntD (Vite)
│   ├── src/                 # pages, components, providers, theme
│   ├── e2e/                 # Playwright tests + fixtures
│   └── Dockerfile
├── docker-compose.yml       # postgres + backend + frontend
├── .github/workflows/ci.yml
├── DECISIONS.md · PROGRESS.md · FUTURE_IDEAS.md
```

---

## Phase 1 — Core foundation (complete)

Everything below is implemented, tested, and explorable with the seeded demo data:

- **Auth + 5-role RBAC** (Super Admin, IT Admin, IT Support, Manager, Employee) enforced at the API layer, not just hidden in the UI.
- **CRUD** for Locations, Departments, Employees, Asset Categories, and Assets.
- **Assign / Transfer / Retire** actions with **enforced lifecycle transitions** and an **append-only audit log** on every create/update/assign/transfer/status-change.
- **Global search** across asset code, serial number, employee name/ID, model, and location (top-bar search box).
- **Dashboard** with metric cards (total / assigned / available / under-repair / retired / warranty-expiring) and an all-locations / per-location filter.
- **CSV/Excel import & export** for assets and employees.
- **Audit log viewer**, restricted to Super Admin and IT Admin.
- **Seed script** with realistic data spread across Pune, Hyderabad, and Bhopal.

### Things to try after `docker compose up`

1. Log in as **IT Admin** → the dashboard shows live metric cards; switch the location filter.
2. Open **Assets** → filter by status, toggle Compact/Comfortable density, **Assign** an available asset, then **Transfer** it. Watch the status change and open the asset to see its audit history.
3. Use the top-bar **search** to jump straight to an asset or employee.
4. **Import** `frontend/e2e/fixtures/assets-import.csv` from the Assets page, and **Export** the current list.
5. Log in as **Employee** and confirm asset-management actions are unavailable (and blocked by the API).

## Phase 2 — Operational depth (complete)

Built on top of Phase 1, tested, and explorable with the seeded demo data:

- **Maintenance / repair module** — a repair ticket runs `reported → under_repair → repaired → reassigned` (or `cancelled`), tracking vendor, estimated & actual cost, and expected/completed dates. Ticket transitions drive the **asset's** status (into `under_repair`, then back to `assigned`/`available`) in a single audited transaction. Employees can report an issue on their own asset; IT roles manage the queue at **Maintenance**.
- **Warranty expiry alerts** — a daily scheduled job raises de-duplicated notifications the day an asset hits 90/60/30 days of remaining warranty, and emails IT (SMTP when configured, otherwise logged to the backend console). Trigger it on demand with `POST /api/warranty/run-check`.
- **Reports** — Asset, Employee, Location, and Warranty reports, each downloadable as **CSV** or **PDF**, from the **Reports** page (`report:run` roles).
- **Employee profile** — every asset assigned to a person, in a single N+1-free query, with status and warranty.

### Things to try (Phase 2)

1. Open **Maintenance** → **Report Issue**, pick an asset, describe the problem, then **Start Repair** → **Mark Repaired** → **Reassign** and watch the asset's status follow along (check its audit trail on the asset page).
2. Open **Reports** → download the **Warranty Report** as PDF and the **Asset Report** as CSV.
3. As IT Admin, `POST /api/warranty/run-check` (see Swagger at `/api/docs`) and then check **notifications** / the backend console for the warranty emails.

## Phase 3 — Scale & governance (complete)

- **Background import jobs** — Settings → **Import jobs**. Upload a CSV/XLSX, map columns (aliases like `Serial No` → `serialNumber` are suggested), dry-run to flag duplicates, then commit. The job runs in-process on the API; poll the job list for `completed` / `failed`. **Rollback** deletes only the rows that job created.
- **Saved filter views + bulk actions** — on **Assets**, pick **Saved view** or **Save view** for the current filters. Select rows and use **Bulk status**, **Bulk transfer**, or **Bulk retire** (partial success: one bad row does not abort the rest).
- **Reconciliation** — Settings → **Reconciliation**. Upload an HR (or inventory) CSV and choose a match key (`employeeCode` / `email`, or `assetCode` / `serialNumber`). Rows only in the file vs only in NewVision are listed. Manual upload only.

### Things to try (Phase 3)

1. **Assets** → filter Status = Available → **Save view** → reload and apply it from **Saved view**.
2. Select a few available assets → **Bulk retire**, or assigned ones → **Bulk transfer** to Hyderabad.
3. **Settings → Import jobs** → upload a CSV with `Serial No` / `Location Code` headers → **Dry-run preview** → **Commit import**. Confirm the new assets, then **Rollback**.
4. **Settings → Reconciliation** → upload a CSV with one real `EMP-#####` plus a fake code; the fake code appears under **Only in uploaded file**.

## Phase 4 — QR codes & webhooks (complete)

The REST API is the existing NestJS surface (Swagger at `/api/docs`). Phase 4 adds physical-audit QR codes and outbound webhooks.

- **QR + scan page** — every asset has `GET /api/assets/:id/qr` (auth) and `GET /api/public/assets/:code/qr` (public) PNG stickers. The QR encodes `{PUBLIC_APP_URL}/scan/{assetCode}`. `/scan/:code` is a mobile-friendly public page (no login) showing status, item, serial, location, assignee, and warranty days — not cost or history.
- **Webhooks** — Settings → **Webhooks**. Subscribe to `asset.created` and `asset.status_changed`. The API POSTs JSON with `X-NewVision-Event` and `X-NewVision-Signature` (HMAC-SHA256 of the raw body). The signing secret is shown once on create.

### Things to try (Phase 4)

1. Open any asset → see the **QR sticker** card → **Open scan page** (or scan the PNG with a phone on the same LAN after setting `PUBLIC_APP_URL`).
2. Visit `/scan/AST-PUN-LAP-0001` while logged out — the audit card still loads.
3. **Settings → Webhooks** → add `http://127.0.0.1:9999/hook` → create or retire an asset → the row’s **Last** column shows the delivery error or HTTP status.

Out-of-scope ideas stay in `FUTURE_IDEAS.md`. All four planned phases are now implemented.

## Prompt 2 — Requests, accessories & UX polish (complete)

- **Asset/accessory requests** — Employees submit at **Requests**; managers approve/reject (reason required); IT Admin marks fulfilled (manual assign only).
- **Accessories & consumables** — Separate modules with checkout/check-in, stock tracking, low-stock alerts, and a **Supplies** report.
- **Dashboard attention panel** — Warranty ≤7 days, stale repairs, low stock, pending requests.
- **UX** — Notification bell, copy-to-clipboard, scoped CSV export, custom pagination on all tables, expand rows, skeleton/empty states, keyboard shortcuts (`/` search, `Esc` dismiss, ↑↓ row focus), axe-core accessibility checks.
- **Branding** — Official NewVision logos in `frontend/public/brand/`.

## Prompt 4 — Dashboard & import charts (complete)

- **Dashboard visualizations** — Status donut, assets-by-location bar chart, 12-month addition trend, sparkline on the Total KPI card. Charts use a dedicated palette (`frontend/src/chartColors.ts`) separate from UI chrome.
- **Import visual summary** — Completed/failed jobs show an outcome donut (created/updated/failed/duplicates) plus a failure-category bar chart when row errors exist.

Current status: **49 unit + 47 integration = 96** backend tests; **22 Playwright** (including a11y, help, request flow).

## Prompt 6 — Audit, Excel-grade tables, Help, ship (complete)

- **Prompt 3 completed** — `#1F1F1F` text hierarchy, two-tier shadows, single accent on interactive chrome.
- **`DataGrid`** — shared Excel-grade table (sort, filter, resize, reorder, show/hide columns, sticky header, density, Ctrl+C row copy, CSV export).
- **Help** — full `/help` documentation area with search, categorized nav, and per-feature articles.
- **Structured import error codes** — `ImportErrorCode` enum on API; charts bucket by code.
- **Seed** — accessories and consumables demo catalog.

See `PROJECT_STATUS.md` for the full gap audit and deliberate exclusions.
