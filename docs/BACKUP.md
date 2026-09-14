# Backup and restore drill

This is the ops runbook. The app does not ship a backup UI.

## What to back up

- **Postgres** (`newvision` database): all tenant data. Row-level `tenant_id` is the isolation key.
- **Secrets**: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PLATFORM_ADMIN_SECRET`, SMTP/Resend keys, `BOOTSTRAP_ADMIN_PASSWORD`. Not in git.
- **Uploaded files** if you later move off `bytea` (import jobs currently store files in Postgres).

## Backup (Render Postgres)

1. Dashboard → the `newvision-db` instance → **Backup** (or `pg_dump` from a machine allowed by `ipAllowList`).
2. Save the dump **outside** Singapore if you have a residency requirement; the demo host is Singapore.

```bash
pg_dump "$DATABASE_URL" --format=custom --file=newvision-$(date +%Y%m%d).dump
```

## Restore drill (do this on a **copy**, not production, the first time)

1. Provision a scratch Postgres 16.
2. `pg_restore --clean --if-exists --dbname="$SCRATCH_DATABASE_URL" newvision-YYYYMMDD.dump`
3. Point a throwaway API instance at the scratch URL.
4. `GET /api/health` must return `{ ok: true, db: "up" }`.
5. Sign in as a known Super Admin and open one asset, one employee, one ticket.
6. Record the time taken. Target: restore verified within the RTO you put in the (external) SLA.

## After restore

- Rotate `JWT_SECRET` if the dump could have leaked.
- Confirm `tenants` rows and that tenant A still cannot `GET /api/assets/:id` of tenant B (see `backend/test/prompt37-tenancy.e2e-spec.ts`).
