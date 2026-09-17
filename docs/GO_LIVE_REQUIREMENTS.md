# NewVision — go-live requirements (checklist)

Engineering sign-off (unit/e2e/Playwright) is documented in [`PROJECT_INVESTIGATION_REPORT.md`](PROJECT_INVESTIGATION_REPORT.md). This list is what **Satyam** still does in Microsoft 365, DNS, and hosting before production cutover.

Detailed context: [`TECHNICAL_REFERENCE.md`](TECHNICAL_REFERENCE.md) — [What's left before real go-live](TECHNICAL_REFERENCE.md#whats-left-before-real-go-live), [Pilot rollout plan](TECHNICAL_REFERENCE.md#newvision-it-admin-pilot-rollout-plan). VPS steps: [`NewVision_GoLive_Hostinger_Guide.docx`](NewVision_GoLive_Hostinger_Guide.docx).

- [ ] **Microsoft Entra** — app registration, client secret or certificate, redirect URI for production SPA, `MS_TENANT_ID` / `MS_CLIENT_ID` / `MS_CLIENT_SECRET` (or cert), optional approved security group; Conditional Access tested with real users ([Entra JIT setup](TECHNICAL_REFERENCE.md#entra-jit-eligibility-microsoft-side-setup), [MFA transition](TECHNICAL_REFERENCE.md#mfa-transition-local-totp-entra-conditional-access)).
- [ ] **Helpdesk mailbox** — production IMAP/SMTP or Microsoft Graph for ticket ingest and outbound mail; SPF, DKIM, and DMARC on the sending domain.
- [ ] **Bootstrap admins** — set `INITIAL_SUPER_ADMIN_EMAILS` to real Super Admin mailboxes; `ALLOW_DEMO_LOGINS=false` in production.
- [ ] **Hostinger VPS** — domain, TLS, env vars (`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `PUBLIC_APP_URL`, file storage path), backup/restore drill ([Hostinger guide](NewVision_GoLive_Hostinger_Guide.docx)).
- [ ] **Depreciation policy** — finance sign-off on rates and fields shown in asset reports (see manual walkthrough in `TECHNICAL_REFERENCE.md`).
- [ ] **Optional:** `SENTRY_DSN` for API error reporting.
- [ ] **Final ops sign-off** — run API soak locally: `SOAK_MS=7200000 node backend/scripts/api-soak.mjs` (2 h health polling; script in `backend/scripts/api-soak.mjs`).

`render.yaml` remains legacy reference only; production target is Hostinger VPS unless that decision changes.
