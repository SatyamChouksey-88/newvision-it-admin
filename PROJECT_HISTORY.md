# NewVision IT Asset Management System — Project History

Ground-truth reconstruction from `git log`, commit messages, the current codebase, existing docs (`PROGRESS.md`, `DECISIONS.md`, `PROJECT_STATUS.md`, `PROJECT_DOCUMENTATION.md`, `ENHANCEMENTS.md`, `FUTURE_IDEAS.md`, `README.md`), and Cursor session transcripts under this repo.

**Source limits (read first):**

- The first git commit on `main` is `daca2c3` (2026-09-10) — *Complete Prompt 6*. Phases 0–4 and Prompts 2–5 were built in this workspace **before** that commit. Those stages are reconstructed from docs + transcripts, not from per-commit diffs.
- Numbered prompts **7, 10, 11, and 21** were never used as titled instruction sets in this repo or in the recovered transcripts.
- A titled **Prompt 25** file/commit does not exist. Later chat look-and-feel work is documented under Prompt 24 follow-ups / leftovers.
- The user’s history brief mentions an “INGenious Batch XML Comparison Report” UI pass. What this repo actually implemented is the **ING INGenious documentation site** as a *Help* structural model (`ing-bank.github.io/ingenious-doc`). A Batch XML Comparison Report mockup was **not found** in git or transcripts — unclear / needs confirmation whether that was a pre-repo research artifact.

Last verified against `main` at `f9582d2` (2026-09-11).

---

## 1. Project Overview

- **What it is:** Internal IT asset inventory, helpdesk, procurement, and staff chat for **NewVision Softcom**. It replaces spreadsheets so IT can answer: how many assets exist, who has what, where it is, warranty/condition, and where it sits in the lifecycle. Product name in the UI chrome is **NewVisionITIS** (`frontend/index.html` title; `DocumentTitleHandler` → `{page} | NewVisionITIS`). Login copy still says “NewVision Softcom directory account.”
- **Who it’s for:** Staff at **Pune, Hyderabad, and Bhopal** (~1,250 serialized assets, ~1,180 employees in the demo seed). Five roles: Super Admin, IT Admin, IT Support, Manager, Employee.
- **Tech stack:**
  - Frontend: React 19, TypeScript, Refine 5, Ant Design 5, Vite 7, React Router 7, `@ant-design/plots`, `socket.io-client`
  - Backend: NestJS 11, Prisma 7.10 + PostgreSQL 16 (`@prisma/adapter-pg`), JWT + refresh tokens, Socket.IO (`/chat`), Nodemailer, ImapFlow
  - Tests: Jest (unit + API e2e), Playwright + axe-core
  - Local: Docker Compose (Postgres + API + Vite)
  - CI: GitHub Actions (`.github/workflows/ci.yml`)
- **Hosting:** Render Blueprint (`render.yaml`) — `newvision-db` (Postgres 16, Hobby Free), `newvision-api` (Docker, `https://newvision-api.onrender.com`), `newvision-web` (static Vite, `https://newvision-web.onrender.com`). Auto-deploy on `main`. Free API sleeps after ~15 minutes idle; free Postgres expires after 30 days.
- **Repo:** https://github.com/SatyamChouksey-88/newvision-it-admin

---

## 2. Chronological Build Log (Prompt-by-Prompt)

### Prompt #0 — Initial research / system design

- **What I asked for:** Independent research and a system-design recommendation before building (referenced later as “the original research document”).
- **What you built/changed:** No dedicated research file from that first pass survives in the repo. Later docs (`PROJECT_STATUS.md` §8) list the **deliberate exclusions** that came out of it (no CMDB, no full ITSM, no AD sync, no workflow engine, etc.). A second, dated research file exists: `RESEARCH_ADMIN_EFFICIENCY.md` (2026-09-11, Prompt 22).
- **Outcome/status:** Research conclusions are reflected in product scope. The original write-up itself is **unclear / not in this repo**.

### Prompt #1 — Autonomous build (Phases 0–4)

- **What I asked for:** (2026-09-09 20:27) Full-stack autonomous build: pick stack, log decisions, test everything. Phases 0 scaffold → 1 core inventory → 2 maintenance/warranty/reports → 3 import jobs/saved views/bulk/reconciliation → 4 QR + webhooks.
- **What you built/changed:** Monorepo `backend/` + `frontend/`. NestJS 11 (not 12 — Jest/ESM), Prisma 7, Refine + AntD 5, Biome, `tsx`/`@swc/jest`. Auth + 5-role RBAC (`permissions.ts`, `JwtAuthGuard`, `RolesGuard`). CRUD for locations, departments, employees, categories, assets. Lifecycle in `assets/lifecycle.ts`. Assign / transfer / retire. Dashboard metrics, global search, CSV/Excel import-export, audit log, seed (~1180 employees / 1250 assets / 5 demo users). Maintenance module + warranty cron + notifications + CSV/PDF reports. Import jobs, saved views, bulk actions, HR reconciliation. QR PNG + public `/scan/:code` + HMAC webhooks. Docker Compose + GitHub Actions. Docs: `DECISIONS.md`, `PROGRESS.md`, later `README.md`.
- **Outcome/status:** Fully done. User also said “continue with phase 3 / phase 4” and “can you up website” the same night. **No git history** until Prompt 6.

### Prompt #2 — Review, accessories, requests, UX (Enhanced)

- **What I asked for:** (2026-09-10 00:01) Supersedes an earlier Prompt 2. Code review vs spec; asset/accessory requests; accessories & consumables as **non-serialized** stock; dashboard attention; notifications; pagination/empty states; branding; a11y.
- **What you built/changed:** `asset-requests/`, `accessories/`, `consumables/` APIs + pages. Request flow `pending → approved|rejected → fulfilled`. Attention panel, `NotificationBell`, `CopyButton`, official logos in `frontend/public/brand/`. Manager profile scope and empty-export 400 were review fixes.
- **Outcome/status:** Fully done (documented in `PROGRESS.md` Prompt 2).

### Prompt #3 — Premium UI pass

- **What I asked for:** UI-only hierarchy (`#1F1F1F` text, two-tier shadows, accent-only interactive color, Help launcher). Referenced in the Prompt 4/5 gap-audit paste as already decided; **no standalone “Prompt 3” paste** was found in recovered transcripts.
- **What you built/changed:** Partial at the time. Prompt 5’s documentation explicitly marked Prompt 3 incomplete (no Help panel, flat shadows). Prompt 6 finished the tokens in `frontend/src/theme.ts`. Later superseded by Prompts 9/12 tokens.
- **Outcome/status:** Partially done when first requested; completed in Prompt 6; visually superseded by Prompts 9/12.

### Prompt #4 — Dashboard & import charts (+ gap-audit file)

- **What I asked for:** (2026-09-10 01:16) Save `PROJECT_STATUS.md` covering research + Prompts 1–3, then fill the chart gap.
- **What you built/changed:** `GET /api/dashboard/trends`; status donut, location bar, 12-month trend, Total KPI sparkline; `frontend/src/chartColors.ts`; import-job outcome donut + failure-category bar via `@ant-design/plots`. Wrote `PROJECT_STATUS.md`.
- **Outcome/status:** Fully done. Growth chart later broken by timezone keys (Prompt 14), made cumulative (Prompt 17), then **removed from the UI** (Prompt 20). API still exists.

### Prompt #5 — Full project documentation

- **What I asked for:** (2026-09-10 01:33) Documentation-only: create `PROJECT_DOCUMENTATION.md` from the real code.
- **What you built/changed:** `PROJECT_DOCUMENTATION.md` (stack, ER, features, gaps). No application code.
- **Outcome/status:** Fully done at the time. **Now stale** in places (still says no refresh tokens; accessories seed empty; dashboard still described as Prompt-4 charts). Do not treat it as current.

### Prompt #6 — Audit, DataGrid, Help, ship

- **What I asked for:** (2026-09-10 01:40) Finish Prompt 3, Excel-grade tables, Help docs, structured import errors, seed accessories/consumables, push to GitHub.
- **What you built/changed:** Shared `frontend/src/components/DataGrid/DataGrid.tsx` (sort/filter/resize/reorder/hide/density/Ctrl+C/CSV). `/help` from `frontend/src/help/articles.ts`. `ImportErrorCode`. Seed catalog. First commit `daca2c3`. Remote: `github.com/SatyamChouksey-88/newvision-it-admin`.
- **Outcome/status:** Fully done. GitHub was initially 404 until the repo existed/was public (ad-hoc, same night).

### Prompt #7

- **Not used.** Number skipped in this project’s instruction series.

### Prompt #8 — Self-audit, offboarding, history

- **What I asked for:** (2026-09-10 02:10) Audit the repo, implement real enhancements, push. Logged in `ENHANCEMENTS.md`.
- **What you built/changed:** `POST /employees/:id/offboard`; `GET /employees/:id/history` + profile History tab; employee list/profile RBAC; DataGrid on remaining lists; KPI cards link to filtered assets; Prisma indexes; Help screenshots under `frontend/public/docs/screenshots/`. Commits `73a47dc`, `8824544`, `085ba40`.
- **Outcome/status:** Fully done.

### Prompt #9 — Match Claude Design mockup

- **What I asked for:** (2026-09-10 02:49) Match `NewVision Asset Manager.html` exactly.
- **What you built/changed:** `design-reference/NewVision_Asset_Manager.html` + `DESIGN_TOKENS.md`; rewrite `theme.ts`; `KpiCard`; dashboard/header/login/`index.css`. Commit `b6e02d3`.
- **Outcome/status:** Fully done, then **visually superseded** by Prompt 12 (`NewVision-standalone-src.html`).

### Functionality audit (between 9 and 12; no official prompt number)

- **What I asked for:** (2026-09-10 03:16) Systematic functionality/bug/performance audit. Leave styling alone.
- **What you built/changed:** Stop truncating assignment/transfer/maintenance history; employee History includes maintenance; DataGrid overflow tooltips; remaining grids; search ticket hits; inactive-employee guards; later inline status + editable requests. Branch `audit/functionality-and-truncation` → PR #1 merge `97a461c`. Commits `63860a2`, `0f4596d`, `c252759`, `2eef02a`, `c1adc6f`.
- **Outcome/status:** Fully done.

### Prompt #10 / #11

- **Not used.** Number skipped.

### Prompt #12 — Merge audit branch + final design system

- **What I asked for:** (2026-09-10 05:51) Merge the pending audit branch and apply tokens from `UI Design System Overview.zip` / `NewVision-standalone-src.html`.
- **What you built/changed:** Fast-forward PR #1. Tokens in `theme.ts` / `index.css`. Login two-column + estate panel; 216px sider + MANAGE + Sign out; 52px header + ⌘K; accessories card grid; employee profile tabs; sessionStorage when “Keep me signed in” is unchecked. Commits `cc318ea`, `371d441`.
- **Outcome/status:** Fully done. User had also asked (05:27) to replace status/location/growth **charts** with colored lists — Prompt 12 **restored charts** to match the mockup. Lists became the primary viz later (Prompt 20).

### Prompt #13 — Tablet, light-only, first-run

- **What I asked for:** (2026-09-10 12:30) Fix status-doc drift; tablet-width admin; force light; empty-estate Welcome; categories + add-employee screens.
- **What you built/changed:** `GET /dashboard/setup` + `FirstRunWelcome`; `TabletCollapse`; `data-color-mode="light"`; Settings → Categories; Employees → Add employee; scan page restyle; `prompt13` Playwright. Commits `64157ec`, `29eb2b7`, `5f7b313`, `3b0c3e8`.
- **Outcome/status:** Fully done. Phone-width admin and dark mode explicitly declined (`DECISIONS.md`).

### Prompt #14 v2 — Bug fixes + Spiceworks helpdesk (includes 15 + 16)

- **What I asked for:** (2026-09-10 13:21) Fix growth chart, select-all header, MANAGE/logos; add a Spiceworks-style **Support Tickets** module separate from maintenance; CSAT/digest/views (Prompt 15); notes + manual correction (Prompt 16). Use this instead of an earlier Prompt 14.
- **What you built/changed:**
  - A1–A3: UTC month keys (`dashboard/trends.ts`); DataGrid select-all checkbox (not wrapped label text); `Menu.ItemGroup` muted MANAGE; `/brand/` logos + favicon. Commit `0758b67`.
  - Tickets: `backend/src/tickets/`, `frontend/src/pages/tickets/`. Lifecycle, comments, watchers, time, canned, templates, attachments, optional asset link, overdue, reports, RBAC. Commit `b3fed51`.
  - Prompt 15 features shipped in the same schema/UI: CSAT, Immediate vs Daily digest, quick/saved views, full-text `q`, contact cards, duplicate-of, bulk assign/close, category default priority, CSV/PDF.
  - Prompt 16: `notes/`, `records/` — append-only notes; `POST /records/:entityType/:id/manual` with required reason; backfill; audit `manual_override`. Commit `56296ab`.
- **Outcome/status:** Fully done. Docs commit `20a32c3`. Deliberately excluded SLA engine, routing rules, KB suggestions, email-in (email-in came in Prompt 20), AI triage, merge/split.

### Prompt #15 / #16

- Not separate pastes. Implemented inside Prompt 14 v2. Fully done.

### Prompt #17 — Verified enhancement pass

- **What I asked for:** (2026-09-10 16:10) Real-repo audit: split the 3.6 MB JS chunk; make Growth a cumulative estate total; fix doc test counts; polish helpdesk/notes.
- **What you built/changed:** `React.lazy` routes + Vite `manualChunks`; cumulative `added` + `total` on trends; empty/loading + axe on tickets/notes; WCAG-safe palette tags (`3c58a04`). Commits `275bb91`, `1811211`, `3fe0e11`.
- **Outcome/status:** Fully done.

### Prompt #18 — Real helpdesk emails (+ interim “futuristic” UI)

- **What I asked for:** Branded HTML ticket emails for the full lifecycle. A futuristic visual pass was also started in this window (glow/glass/mesh/bento). **No titled “Prompt 18” user paste** was found; work is identified from `PROGRESS.md` + commit `4d88f4c`.
- **What you built/changed:** `backend/src/notifications/ticket-email-templates.ts`; `MailerService.send` optional HTML; requester creation confirmation; `ticket-emails.e2e-spec.ts`.
- **Outcome/status:** Emails fully done. Futuristic UI **reverted in Prompt 19**.

### Prompt #19 — Re-match the reference mockup

- **What I asked for:** Re-read `design-reference/NewVision-standalone-src.html` and drop the futuristic overlay.
- **What you built/changed:** Commit `043ea18` — removed glow/glass/mesh/bento/live-pulse; kept ⌘K palette (restyled plain) and “Updated N minutes ago”; fixed AntD green tag contrast.
- **Outcome/status:** Fully done.

### Prompt #20 — Visual rebuild, role shells, email-in

- **What I asked for:** (2026-09-10 23:09) Large combined brief: custom sider, role-specific homes, ticket depth, email-in, users/password, accessories-by-location, QR sheets. Preceded the same evening by Hindi requests to match the zip mockup, research competitors, and merge tickets with email.
- **What you built/changed:**
  - Part 1 `1bd834f`: JWT refresh + password reset, Users CRUD, RBAC-scoped dashboard, delete guards.
  - Part 2 `7a644f0`: per-location accessory/consumable stock, search coverage, `SEED_ON_START` flag.
  - `3b18e87`: email-in (`email-inbox.service.ts`, IMAP + `/api/email-in/ingest` webhook), `waiting_on_employee` SLA pause, QR label sheets.
  - `2d9c8be`: role shells (`navForRole` in `access.ts`), chip filters, ticket UI.
  - Docs `49ee39e`. Custom `AppSider`. Growth chart **removed from UI**; status/location became colored tables (`0c2ed5f` next morning).
- **Outcome/status:** Fully done as scoped. Email-in is implemented but **locally unproven** without `IMAP_HOST` (ingest webhook is the fallback).

### Prompt #21

- **Not used** as a numbered title. Informal Prompt-20 leftovers (dashboard list layout, Back/Forward/Refresh) landed immediately after (`1757445`).

### Help rebuild (MkDocs / INGenious docs — not a numbered prompt)

- **What I asked for:** (2026-09-11 04:43) Rebuild Help as a real documentation site, reference ING INGenious docs.
- **What you built/changed:** Commit `636f901`. Full-page Help: skip-link, fixed header, collapsible nav, auto ToC, At a Glance, client-side search, admonitions. `HelpHome.tsx`, `NavTree.tsx`, `ArticleBody.tsx`, `TableOfContents.tsx`, `SearchOverlay.tsx`.
- **Outcome/status:** Fully done.

### Prompt #22 — Admin efficiency (item-by-item)

- **What I asked for:** Research first (`RESEARCH_ADMIN_EFFICIENCY.md`, 2026-09-11 04:26), then implement the work list one item at a time (items #1–#20).
- **What you built/changed (commits):**
  - #1 `7af5e5a` — ticket timeline no longer says “Not started” after work began (`tickets.lifecycle.ts`).
  - #2 `bbcb189` — requester, assignee, Age/SLA on ticket list.
  - #3 `f7ba3ab` — Assign to me.
  - #4 `2025851` — warranty expiring vs already expired.
  - #5 `dc5a78b` — stale-repair attention → `/maintenance?staleDays=14`.
  - #6 `a48bc97` — ordered **My work** list (replaced Needs attention).
  - #7 `8e91f62` — contracts ending + incomplete checklists on Employees.
  - #8 `20b5f27` — canned replies can wait-on-employee or resolve.
  - #9–#20 `dc1ede1` and related: issue kits (`issue-kits.service.ts`, Settings → Issue kits), bulk assign, ticket `J`/`K`/`Enter`/`I` + Ctrl+/ overlay, asset `Audit now` / `lastAuditedAt`, loaner `expectedReturnAt`, due-tomorrow view, last ticket view + last create category in `localStorage`, role-filtered command palette, IT Support Account nav, copy-email can log a public comment, `{{employee}}` / `{{asset}}` templates, optional `supportTicketId` on maintenance, light presence heartbeat, `EMP-` exact match, onboarding runbook.
- **Outcome/status:** Fully done as logged. My work list UI was later paginated (then reverted — see leftovers).

### Prompt #23 v2 — Vendor & Procurement

- **What I asked for:** Vendor onboarding, requisitions modeled on the internal approval-email template, PO / GRN / invoice 3-way match, contracts/SLA renewals, scorecards. **No titled “Prompt 23” paste** in recovered transcripts; identified from commit `2948dff` + `PROGRESS.md` / `DECISIONS.md`.
- **What you built/changed:** Prisma migration `20260911140000_prompt23_procurement`. `backend/src/procurement/` (`vendors`, `requisitions`, `purchase-orders`, `contracts`, 3-way `match.ts`). Frontend `frontend/src/pages/procurement/`. Parallel To/Cc approval, material vs trivial edit, withdraw, reject→resubmit, PO amend/cancel/short-close, GRN partial + void, handoff + reconcile flags, renewal cron. Help + reports cards. Managers: team requisitions only.
- **Outcome/status:** Fully done as scoped. Not built (by design): e-sourcing, supplier portal, PunchOut, OCR invoices, GL, payment execution.

### Prompt #24 — Teams-style Team Chat

- **What I asked for:** (2026-09-11 18:44) Upgrade the polling staff-chat drawer into a Microsoft Teams-style chat: channels, DMs, groups, threads, reactions, presence, real-time. No calls/meetings.
- **What you built/changed:** Migration `20260911190000_prompt24_teams_chat`. `backend/src/chat/` — REST + `chat.gateway.ts` Socket.IO `/chat`, mentions, unread, files, presence. Frontend `frontend/src/pages/chat/ChatPage.tsx`, `ChatBody.tsx`, `useChatSocket.ts`. Seeded `#it-ops`, `#helpdesk`, `#procurement`. Staff-only (`SUPER_ADMIN` / `IT_ADMIN` / `IT_SUPPORT`). Default open conversation `#it-ops`. An earlier, smaller staff chat shipped in `195243b` the same morning after a Hindi request for an in-app admin chat.
- **Outcome/status:** Fully done as scoped. Left/right Teams bubbles and document paste were **wrong or incomplete** until the leftovers pass (`5fe1189`).

### Prompt #25 — Chat color / look-and-feel

- **What I asked for:** History brief calls this “chat color-coding / look-and-feel.” Recovered as the Hindi request (2026-09-11 21:46): own vs other messages must sit left/right like Teams; the replica was confusing.
- **What you built/changed:** Commit `5fe1189` — Teams Comfy bubbles (`nv-teams-msg is-mine` / `is-theirs`) for DM, group, **and channels including `#it-ops`**; overflow-safe transcript; light `.nv-chat-pre`; file cards; in-bubble edit; clipboard prefers real files over Office thumbnails (`frontend/src/utils/clipboardChat.ts`); Office MIME allow-list in `chat-files.ts`.
- **Outcome/status:** Fully done. No commit or file is literally titled “Prompt 25.”

### After Prompt 25 — leftovers scan (2026-09-11 evening)

- **What I asked for:** Word-file leftover list + Agent prompt: sign-out, title, typed/renamable asset numbers, dashboard collapse, search chrome, cell truncation, chat overflow, destructive confirms. Then: keep My work as the **old scrolled list** with header-only collapse. Then: push remaining code and deploy to Render.
- **What you built/changed:**
  - Sign out: `AppSider` Modal awaits `logoutAsync()` then `window.location.assign('/login')`; copy NewVisionITIS.
  - `index.html` title `NewVisionITIS`.
  - Asset number: `assets.service.ts` `update()` persists `assetCode`; `asset-code.ts` / `frontend/src/utils/assetCode.ts`; form field + rename confirm. Commit `ba2e7ba`.
  - Search: header 360–480px field; palette ~640px.
  - Truncation: `.nv-cell-line` / `.nv-cell-pair`.
  - Confirms: `useConfirmAction.ts` on destructive actions (not Save/Send/Assign to me).
  - Dashboard: first `1f01c93` added paging + row chevrons (user rejected); `f9582d2` restored simple 420px scroll list; **only** My work header caret (`DashSection.tsx`, `nv.dash.collapse.my-work`); Status / location / tickets stay open.
- **Outcome/status:** Fully done and pushed. Render: web live on `f9582d2`; API live on `5fe1189` (no backend files in `f9582d2`).

---

## 3. Individual / Ad-hoc Tasks (Outside the Numbered Prompt Series)

| When | What I asked for | What you did | Outcome |
|------|------------------|--------------|---------|
| After Phase 2 (Sep 9 23:57) | “can you up website” | Started local Docker/Vite stack | Done (local) |
| After Prompt 6 (Sep 10 02:05) | GitHub URL 404 / “unable to see” | Repo created/pushed; visibility was the issue | Done — public `newvision-it-admin` |
| During Prompts 2/4/6/8 | “why r u waiting for sub agent” / “continue” | Stopped waiting on explore subagents; continued in-session | Process only |
| Sep 10 05:27 | Dislike status / location / growth charts; prefer colored bullets | Temporary list viz; Prompt 12 restored charts; Prompt 20 lists again | Done, then reversed twice by later prompts |
| Sep 10 16:10 area | “up the website” | Local servers | Done |
| Sep 10 21:18–21:47 | Zip mockup not followed; sidebar childish; compare design not content; research competitors + email-merge tickets | Research + fed Prompt 20 | Done as Prompt 20 |
| Sep 11 00:09–01:57 | Fix this page; horizontal bar + back/refresh/next on every page; push; colored tables; colorful outlines; sider too dry | `1757445` HistoryNav (Back/Forward/Refresh); `0c2ed5f` colored breakdown tables; later sider/token work | Done; some “colorful sider” asks were walked back to the approved light mockup |
| Sep 11 02:07–02:15 | Can we build in-app admin chat + share ticket links? Build all options without asking | First staff chat in `195243b` (polling drawer) | Partially done → replaced by Prompt 24 |
| Sep 11 02:24 | “please fix ui/ux alignment” | Toolbar / list alignment pass | Done enough that later dedicated toolbar prompts still fired |
| Sep 11 04:00 | “can you up the server” | Local API/Vite | Done |
| Sep 11 04:05 | Investigation report of Prompt 20 + everything since | Report only (no file dedicated to it survives as a standalone; findings fed Help + Prompt 22) | Done as investigation |
| Sep 11 16:19–17:23 | Ticket toolbar wrap; then “one clean line”; then ChatGPT-style expand/collapse | `dc1ede1` / `9b9f1d4` / `5f8fe77` — toolbars above thead; sider collapse like ChatGPT | Done |
| Sep 11 17:42–18:55 | Deploy on Render; connect Cursor; want **free** plan; applied Blueprint; “why we see this in url” | `render.yaml` (`018de4d`, `4c10aa3` Hobby Free, `0121ffc` monorepo Docker paths, `830fcef` tsconfig.build). Live `newvision-web` / `newvision-api` | Done. Free-plan sleep/expiry remain |
| Sep 11 18:05 | Assets cells truncated; scrollbar under table | `fda0915` | Done; leftovers later refined overflow CSS |
| Sep 11 19:28 | “why we see refine” / remove Refine / use **NewVisionITIS** | Browser title no longer “Refine”; product name NewVisionITIS. Refine **library** remains (framework) | Done for branding; Refine is still the app framework |
| Sep 11 19:49 | Word file for employee feedback (functionality / bugs / suggestions) | `New Microsoft Word Document.docx` / `NewVision_Employee_Feedback_Form.docx` created locally — **not committed** (binary leftover) | File exists in workspace only |
| Sep 11 19:52 | Confirmations before destructive actions site-wide | `useConfirmAction` in leftovers `5fe1189` | Done |
| Sep 11 21:35 | Sign-out still broken; re-read the Word file | Leftovers Job 1 — await logout + hard redirect | Done (`AppSider.tsx`) |
| Sep 11 21:39 | Title already NewVisionITIS (status note) | Confirmed `DocumentTitleHandler` | Done |
| Sep 11 21:53 | Why can’t we type/change asset number? | `ba2e7ba` + leftovers persist/rename | Done |
| Sep 11 21:56 | Docker login id? | Answered from local context (no code change) | Informational |
| Sep 11 22:21 | My work: old list + header collapse only | `f9582d2` | Done |
| Sep 11 23:49 | Push leftover code + deploy Render | Nothing unpushed on `main`; Render already live | Done |
| Sep 11 23:56 | This history document | `PROJECT_HISTORY.md` | This file |

---

## 4. Current Feature Inventory

Status key: ✅ working in code (and covered by tests unless noted) · ⚠️ partial or unproven in production · ❌ missing / broken

### Core Asset & Employee Management

| Feature | Status | Where |
|---------|--------|--------|
| Asset CRUD + lifecycle state machine | ✅ | `assets.service.ts`, `lifecycle.ts`, `pages/assets/` |
| Typed or auto `AST-{LOC}-{CAT}-{SEQ}` codes; rename with confirm | ✅ | `asset-code.ts`, `form-fields.tsx` |
| Assign / transfer / retire / status; optional accessories on assign | ✅ | `pages/assets/actions.tsx` |
| Bulk status / transfer / retire / assign | ✅ | `POST /api/assets/bulk` |
| Issue kits + employee onboarding runbook | ✅ | `issue-kits.service.ts`, `settings/issue-kits.tsx` |
| Loaner `expectedReturnAt` (no auto check-in) | ✅ | assign API + My work |
| Audit stamp (`Audit now`, 12-month filter) | ✅ | asset show; public scan stays read-only |
| Duplicate asset + 20-up QR PDF | ✅ | asset show |
| Categories, locations, departments | ✅ | Settings + `/locations` |
| Employees, create-login, offboard, History tab, Follow-up filter | ✅ | `employees/`, `pages/employees/` |
| Checklists (onboard/offboard templates) | ✅ | `checklists.controller.ts`, `settings/checklists.tsx` |
| Saved views, CSV/Excel import + background jobs, scoped export | ✅ | `import-jobs/`, Settings tabs |
| HR/inventory reconciliation (manual CSV) | ✅ | `reconciliation/` |
| QR + public `/scan/:code` (no assignee/serial) | ✅ | `public-assets/`, `pages/scan.tsx` |
| Webhooks (`asset.created`, `asset.status_changed`, HMAC) | ✅ | Settings → Webhooks |
| Append-only notes + manual correction (reason required) | ✅ | `notes/`, `records/` |

### Accessories Tracking

| Feature | Status | Where |
|---------|--------|--------|
| Accessories checkout/check-in, per-location stock | ✅ | `accessories/`, `pages/accessories/list.tsx` |
| Consumables issue + low-stock | ✅ | `consumables/`, `pages/consumables/list.tsx` |
| Card grid + table toggle on accessories | ✅ | Prompt 12 |
| Seeded demo catalog | ✅ | `prisma/seed.ts` (Prompt 6; `PROJECT_DOCUMENTATION.md` still wrongly says empty) |

### Helpdesk / Ticketing (internal + email pipeline)

| Feature | Status | Where |
|---------|--------|--------|
| Support tickets (separate from Maintenance and Asset Requests) | ✅ | `tickets/`, `pages/tickets/` |
| Comments public/internal, watchers, time, attachments, screenshot paste | ✅ | ticket show + create |
| Canned macros (optional wait / resolve) + templates with `{{employee}}` / `{{asset}}` | ✅ | Settings → Helpdesk |
| CSAT, digest vs immediate email, duplicate-of, bulk assign/close | ✅ | |
| Branded HTML lifecycle emails | ⚠️ | Works when SMTP is set; console fallback otherwise. Render Free often cannot send on 587/465 |
| Email-in (IMAP poll + ingest webhook, loop/OOO/dedupe, unmatched From) | ⚠️ | Implemented (`email-inbox.service.ts`). Not proven on a live mailbox in this environment |
| Waiting-on-employee pauses first-response SLA | ✅ | `ticket-sla.ts` |
| Queue keys J/K/Enter/I; Ctrl+/ overlay | ✅ | ticket list |
| Assign to me; requester/assignee/Age columns | ✅ | |
| Link ticket ↔ maintenance | ✅ | optional `supportTicketId` |
| SLA **engine** / routing rules / KB suggestions / merge-split | ❌ | Deliberate exclusion |

### Maintenance (hardware repair — not the helpdesk)

| Feature | Status | Where |
|---------|--------|--------|
| Repair lifecycle coupled to asset status | ✅ | `maintenance/`, `pages/maintenance.tsx` |
| Stale 14-day filter from My work | ✅ | |

### Vendor & Procurement

| Feature | Status | Where |
|---------|--------|--------|
| Vendor lifecycle, bank re-approval, blacklist, scorecards | ✅ | `procurement/vendors.*` |
| Requisition template + parallel To/Cc | ✅ | `requisitions.*`, `pages/procurement/requisitions/` |
| PO convert/amend/cancel/short-close, GRN, 3-way match (~2%) | ✅ | `purchase-orders.*`, `match.ts` |
| Contracts + 90/60/30/7 renewal alerts, renew/clone | ✅ | `contracts.*` |
| Handoff to assets/accessories/consumables/licenses | ✅ | flags `needsReconciliation` instead of deleting |
| E-sourcing / PunchOut / OCR / GL / payments | ❌ | `FUTURE_IDEAS.md` |

### Staff Chat (Teams-style)

| Feature | Status | Where |
|---------|--------|--------|
| Full-page `/chat`, header launcher, unread badge | ✅ | `ChatPage.tsx`, `StaffChat.tsx` (launcher) |
| Channels / DMs / groups; `#it-ops` default | ✅ | `chat.service.ts` |
| Threads, reactions, structured @mentions, attachments, document paste | ✅ | `ChatBody.tsx`, `clipboardChat.ts` |
| Own right / others left (including `#it-ops`) | ✅ | leftovers / Prompt 25 look-and-feel |
| Presence, typing, live updates (Socket.IO) | ✅ | `chat.gateway.ts`, `useChatSocket.ts` |
| Search, seen-by on small DMs, record-code unfurl | ✅ | |
| Pin / bookmark / forward; calls / meetings / guests / Teams federation | ❌ | By design |

### Dashboard & Reporting

| Feature | Status | Where |
|---------|--------|--------|
| Role homes: IT console / Support queue / Manager team / Employee My IT | ✅ | `dashboard.tsx`, `navForRole` |
| KPI tiles + My work ordered list + header-only collapse | ✅ | `DashSection.tsx` |
| Status + location **tables** (not charts) | ✅ | `BreakdownList.tsx` |
| Warranty split expiring vs expired | ✅ | |
| First-run Welcome on empty estate | ✅ | `FirstRunWelcome.tsx` |
| Reports: asset/employee/location/warranty/supplies + procurement cards | ✅ | `pages/reports.tsx` |
| Ticket reports | ✅ | `pages/tickets/reports.tsx` |
| Growth chart on home | ❌ | Removed in Prompt 20 (API `/dashboard/trends` unused by UI) |

### Roles & Permissions (how they differ in the UI)

From `backend/src/common/rbac/permissions.ts` and `frontend/src/access.ts` `navForRole`:

| Role | Home / nav feel | Can do | Cannot |
|------|-----------------|--------|--------|
| **Super Admin** | Full IT console + Settings + Users + Audit + Procurement + Chat | Everything including `user:manage` and `asset:delete` | — |
| **IT Admin** | Same console minus Users (no `user:manage` / `asset:delete`) | Run the estate: assets, employees, locations, tickets, procurement, audit, settings | User admin, hard-delete assets |
| **IT Support** | Queue-first home; Chat; **Account** (not full Settings) | Read assets/employees, manage maintenance + tickets, reports | Create/assign/retire assets, procurement, org CRUD, audit |
| **Manager** | **Team** home; Requests; Team tickets; Requisitions; Reports | Approve direct-report hardware requests; raise/see team PRs; team tickets (no assign/internal/time) | Chat, Vendors/POs/Contracts, Locations, Settings |
| **Employee** | **My IT**; My devices; Raise a request; My tickets; Help | Own assets, report issue, request kit, own/watched tickets (public comments) | Chat, admin lists, reports, procurement |

Frontend `IT_ADMIN` permission list is `ALL` minus user-manage/delete; backend `IT_ADMIN` omits `request:approve` / `issue:report` / `asset:request`. Those employee/manager actions are still available via other ticket/request rules. **Unclear / needs confirmation** whether that matrix drift is intentional.

### Other modules

| Feature | Status | Where |
|---------|--------|--------|
| JWT access (15–30 min) + rotating refresh (7d) | ✅ | `auth/`, `providers/axios.ts` |
| Forgot / change / admin reset password | ✅ | `login.tsx`, `reset-password.tsx`, Settings users |
| Command palette ⌘K / Ctrl+K; header search opens it | ✅ | `CommandPalette.tsx`, `Header.tsx` |
| Notification bell + deep links (`/chat?c=&m=`) | ✅ | `NotificationBell.tsx` |
| In-app Help documentation site | ✅ | `/help` |
| Audit log viewer | ✅ | `/audit-logs` |
| Light-only + tablet floor | ✅ | `theme.ts`, `TabletCollapse` |
| History Back / Forward / Refresh on pages | ✅ | header |
| ChatGPT-style sider collapse | ✅ | `AppSider.tsx` + `siderPref` |
| Destructive confirms | ✅ | `useConfirmAction.ts` |
| Phone-width authenticated admin | ❌ | Non-goal |
| Dark mode | ❌ | Non-goal |
| SSO / LDAP / live AD | ❌ | Non-goal |

---

## 5. Known Issues / Open Bugs

Reported and **not fully resolved**:

| Issue | Raised | Status |
|-------|--------|--------|
| `SEED_ON_START=true` wipes demo edits on backend boot | Phase 0 / README; still true on Render (`render.yaml` sets `true`) | Documented workaround: set `false` after first boot. Render uses `SEED_IF_EMPTY=true` as well — **unclear** whether production deploys still reseed on every start |
| Email-in unproven without a real IMAP mailbox | Prompt 20; Help articles still say this | Ingest webhook exists; no live-mailbox verification in this environment |
| SMTP often unavailable on Render Free (ports 587/465) | Render deploy (ad-hoc Sep 11) | Console-log fallback; branded emails won’t leave the host |
| Free Render API sleeps (~1 min wake); free Postgres expires in 30 days | Render deploy | Platform limit, not an app bug |
| Keyboard shortcuts strongest on assets/employees; not every list | Prompt 2 / PROJECT_STATUS §9 | Partial |
| `PROJECT_DOCUMENTATION.md` drift (refresh tokens, seed accessories, dashboard charts, test counts) | Prompt 5 file never fully rewritten after Prompt 20+ | Docs bug |
| Playwright “create asset” accumulates same-model demo rows | `PROGRESS.md` known issues | Harmless; reseed clears |
| Full backend e2e + full Playwright not re-run after the leftovers evening | Leftovers Job 9 | Dashboard Playwright (2) + targeted unit tests ran; **suite-wide green is not re-confirmed** |
| Chat pin / bookmark / forward | Prompt 24 follow-up | In `FUTURE_IDEAS.md`, not a defect |
| IMAP / one-mailbox only | Prompt 20 | By design |

**Fixed after they were raised** (not open): growth chart zeros (14), select-all text (14), MANAGE rainbow (14), history truncation (audit), ticket “Not started” (22), missing requester/assignee (22), no Assign to me (22), mixed expired warranties (22), chat all-left + Word thumbnail paste (25/leftovers), sign-out bounce (leftovers), uneditable asset numbers (leftovers), My work paging/chevrons (reverted `f9582d2`).

---

## 6. Architecture Notes

### Folder / module structure (today)

```
IT_ADMIN/
├── backend/
│   ├── prisma/schema.prisma + migrations + seed.ts
│   └── src/
│       ├── auth/ users/          # login, refresh, password, Users CRUD
│       ├── assets/               # lifecycle, codes, bulk, issue-kits, QR helpers
│       ├── accessories/ consumables/ asset-requests/
│       ├── employees/            # profile, offboard, history, checklists
│       ├── locations/ departments/ categories/
│       ├── maintenance/          # hardware repair
│       ├── tickets/              # helpdesk + email-in + SLA + digest
│       ├── notes/ records/       # append-only notes + manual override
│       ├── procurement/          # vendors, PRs, POs, GRN, invoices, contracts
│       ├── chat/                 # REST + Socket.IO gateway
│       ├── dashboard/ search/ reports/ audit/ notifications/
│       ├── import-export/ import-jobs/ saved-views/ reconciliation/
│       ├── qr/ public-assets/ webhooks/
│       └── common/               # guards, rbac/permissions.ts, lifecycle utils
├── frontend/src/
│   ├── pages/                    # one folder per area (assets, tickets, chat, procurement, help, …)
│   ├── components/               # AppSider, Header, DataGrid, DashSection, KpiCard, …
│   ├── providers/                # authProvider, dataProvider, axios + refresh
│   ├── hooks/                    # useChatSocket, useConfirmAction, …
│   ├── help/articles.ts
│   ├── access.ts                 # nav + permission mirror
│   └── theme.ts                  # light-only tokens
├── design-reference/             # mockup HTML + DESIGN_TOKENS.md
├── render.yaml
└── docs: README, PROGRESS, DECISIONS, PROJECT_STATUS, ENHANCEMENTS, FUTURE_IDEAS, this file
```

### Key design decisions (why)

- **Monorepo, two `package.json`s** — Nest and Vite toolchains stay independent (`DECISIONS.md` Phase 0).
- **Nest 11 + Prisma 7 + Biome + tsx/@swc/jest** — Nest 12 ESM and TS 7 broke Jest/ESLint; this combination actually tests.
- **Serialized assets vs accessories vs consumables vs helpdesk vs maintenance vs requests** — five different jobs. Mixing them (e.g. a printer ticket *and* an `under_repair` row) is allowed but not auto-merged.
- **No workflow engine** — hardware requests are one manager step; PR approval is a role matrix (parallel To/Cc by default).
- **In-process import queue** — no Redis for local/demo scale.
- **Light-only, tablet floor** — approved mockup; phones use `/scan/:code`.
- **Custom `AppSider`** — Refine `ThemedSider` could not match 216px pinned chrome.
- **Help stays in-app** — INGenious *structure*, NewVision *tokens*.
- **Chat is staff-only Teams-style** — not a Teams tenant; no calls.
- **Procurement handoff never deletes** — later PO/GRN changes flag reconciliation.
- **Render path filters** — API deploys on `backend/**` only; web on `frontend/**`. Docs-only commits do not redeploy the API.

Patterns used consistently: global JWT + `@Roles()` guards; append-only `audit_logs`; Refine `{ data, total }` lists with `_start/_end/_sort/_order`; shared `DataGrid`; confirm-then-mutate for destructive actions; seed demo accounts `*@newvision.local` / `Password123!`.

---

## 7. What's Next / Not Yet Started

From `FUTURE_IDEAS.md` and `PROJECT_STATUS.md` §8 — discussed, **not built**, and should stay out until explicitly scoped:

- Redis/Bull (or any real job queue) for large imports
- Live HR / Entra / AD sync; fuzzy reconciliation
- SLA-breach automation, routing-rules builder, KB suggestions, AI triage
- Multi-mailbox or Slack/Teams/SMS ticket ingest
- Ticket merge/split, custom fields, CSAT re-send, editable notification templates
- E-sourcing, supplier portal, PunchOut, full CLM, multi-entity/currency procurement, OCR invoices, GL, payment execution
- Chat pin / bookmark / forward / quote-reply
- Audio/video calls, meetings, screen share, guest chat, Microsoft Teams federation
- Bulk manual-edit tool; editing/deleting audit/notes/comments
- Phone-width admin app; dark mode
- CMDB / dependency graphs; change & release management; vuln/patch; BCP/DR

Operational follow-ups that are **not features** but are unfinished:

- Point a real mailbox + SMTP at Render (or move off Free) so email-in and ticket mail are proven
- Rewrite `PROJECT_DOCUMENTATION.md` against Prompt 20–25 (it still reads like Prompt 19)
- Re-run the full Jest + Playwright suites after the leftovers evening if you need a certified green bar
- Decide whether `SEED_ON_START=true` on Render is acceptable for a live demo

---

*Generated 2026-09-11 from git `f9582d2`, the files listed above, and Cursor transcripts for this workspace. Items marked “unclear / needs confirmation” were not invented.*
