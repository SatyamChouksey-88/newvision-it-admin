# QA test plan — NewVision

Release-grade plan for Prompts 29–30. A case **passes** only if it was observed in the running app or a genuinely green automated test. Assumptions are logged as gaps, not passes.

**Environment:** local `http://localhost:5173` + `http://localhost:3000` (seeded demo). Production smoke is a separate section (`https://newvision-web.onrender.com`).

**Roles:** Super Admin (`superadmin@newvision.local`), IT Admin (`itadmin@newvision.local`), IT Support (`support@newvision.local`), Manager (`manager@newvision.local`), Employee (`employee@newvision.local`). Password `Password123!`.

## 1. Areas and types

| Area | UI | Functional | E2E flow | Regression | A11y | Security | Perf |
|------|----|------------|----------|------------|------|----------|------|
| Shell (nav, header, palette, Help) | x | x | | x | x | x | |
| Assets + lifecycle | x | x | x | x | x | x | x |
| Employees / offboard | x | x | x | | | x | |
| Accessories / consumables | x | x | | | | x | |
| Maintenance | x | x | | | | x | |
| Requests | x | x | x | | | x | |
| Helpdesk / tickets | x | x | x | x | x | x | |
| Team Chat | x | x | x | x | x | x | x |
| Procurement | x | x | x | | | x | |
| Reports / dashboard | x | x | | x | | x | x |
| Import / reconciliation | x | x | | | | x | |
| QR / public scan | x | x | | | | x | |
| Settings / users / audit | x | x | | | | x | |
| Help documentation | x | x | | x | x | | |

## 2. Concrete cases

IDs are referenced from `QA_RESULTS.md`. Expected results are the **current** product behavior.

### 2.1 UI — shell and lists (U)

| ID | Role | Case | Expected |
|----|------|------|----------|
| U1 | IT Admin | Dashboard at 1280px | KPI tiles, My work, no overlap, light theme |
| U2 | IT Admin | Dashboard / lists at ~1280 toolbar wrap | Header search + Chat + bell + Help remain usable |
| U3 | Employee | My IT home | Devices, Raise a ticket, Request a device, open tickets |
| U4 | IT Support | Home is queue / My work, no estate KPI row | Matches IT Support shell |
| U5 | Manager | Team home + TEAM sider | No Vendors / Chat / Settings nav |
| U6 | All lists | Loading skeleton then rows or empty+action | Failed fetch is error+Retry, not a fake empty catalog |
| U7 | Assets | Truncation shows tooltip or wrap | No silent clip of asset codes |
| U8 | Any | Copy chip toasts | ⧉ copies code |
| U9 | IT Admin | ⌘K / header palette button | Role-filtered destinations; type `TCK-` jumps |
| U10 | IT Admin | `?` opens Help; `Ctrl+/` shortcuts overlay | Two different surfaces |
| U11 | IT Admin | Bell opens notifications | Deep link works for a ticket/chat row |
| U12 | All | Help launcher | `/help` landing + Back to app |
| U13 | IT Admin | axe-core on dashboard, assets, tickets, Help, chat | No serious/critical |
| U14 | Help | Skip-to-content is first Tab target | Focus ring visible |
| U15 | Chat / procurement | Status uses color+icon+text | Not color alone |

### 2.2 Functional (F)

| ID | Case | Expected |
|----|------|----------|
| F1 | Asset create / assign / transfer / retire / lost / damaged | API rejects illegal transitions |
| F2 | Accessory checkout / check-in; consumable issue / low-stock | Quantities move; Employees/Managers 403 on stock lists |
| F3 | Employee create + login; offboard leaves assets until returned | History preserved; picker hides inactive |
| F4 | Maintenance reported → under_repair → repaired | Asset status coupled |
| F5 | Request pending → approve/reject → fulfill | Fulfill does not auto-assign |
| F6 | Ticket raise (portal), statuses, waiting_on_employee pauses SLA | Overdue label from first-response targets |
| F7 | Public vs internal comments; watchers; canned macro; CSAT; duplicate-of | Internal never emails requester |
| F8 | Chat channel/DM/thread/mention/reaction/attachment/presence | Staff only; 403 otherwise |
| F9 | Vendor statuses; PR template; approval icons; PO GRN partial; 3-way match; contract renewal | Suspended vendor not selectable |
| F10 | Manual correction requires reason; audit row | Cannot bypass status machines |
| F11 | Import dry-run / commit / rollback; reconciliation set-diff | 10 MB cap |
| F12 | Reports scoped by role | Manager CSV omits other teams; supplies 403 for Manager |
| F13 | Public scan | Status/item/category/location/warranty only — no PII |
| F14 | Forms: validation, no double-submit on ticket Send | Send disabled while in flight |

### 2.3 End-to-end journeys (E)

| ID | Journey | Expected |
|----|---------|----------|
| E1 | New hire: employee → login → assign kit → accessories → onboard checklist | All records linked to the person |
| E2 | Ticket lifecycle portal (+ email-in if IMAP) | Notify + assign + public/internal + waiting + resolve + CSAT + close |
| E3 | Procurement: PR → approvals → PO → GRN (partial) → invoice match → handoff asset | Asset created available, not assigned |
| E4 | Offboard: return kit → check in accessories → disable login | History remains |
| E5 | Two-session chat | Real-time message, reaction, mention, presence |

### 2.4 Regression (R)

| ID | Case | Expected |
|----|------|----------|
| R1 | Backend unit + e2e | Green, or known env timeout on full-suite `phase2` only |
| R2 | Frontend Playwright + axe | Green after Help updates |
| R3 | Seed FK, EMP- search, mailer never throws, audit search remount, WCAG, color system, code-splitting | Still true |
| R4 | Prompt 28 RBAC (notes, search, inventory, reports, trends) | `audit-28-rbac` e2e |

### 2.5 Security (S)

| ID | Case | Expected |
|----|------|----------|
| S1 | Direct API as Employee/Manager cannot list accessories, notes on foreign assets, vendor reports | 403 |
| S2 | Public scan / vendor bank | No assignee/serial; bank pending re-approval |
| S3 | Chat uploads | Executables / html / svg / jar blocked; 10 MB imports |
| S4 | JWT expiry | Graceful re-login, no client privilege escalation |

### 2.6 Performance (P)

| ID | Case | Expected |
|----|------|----------|
| P1 | Assets list on ~1,250 rows | Usable; server pagination |
| P2 | Dashboard / ticket timeline / vendor show | No obvious N+1 freeze |
| P3 | Frontend bundle | Code-split (lazy routes) |
| P4 | Chat socket | No reconnect storm |

## 3. Help documentation (Prompt 29)

| ID | Case | Expected |
|----|------|----------|
| H1 | At a glance includes Assets, Tickets, Team Chat, Vendor & Procurement, Roles, Tips | Cards link to first article |
| H2 | Nav tree expand/collapse; Team Chat section | Managing the IT queue still under Support tickets → For IT staff |
| H3 | TOC from real headings | Getting Started: Welcome, Demo logins, First steps |
| H4 | Search: keyboard, demo logins, hidden gems, presence legend, 3-way match | Correct articles |
| H5 | Every article route renders h1 | No crash |
| H6 | Declared screenshots have naturalWidth > 0 | Light theme, current chrome |
| H7 | Internal markdown links | Render as router links |
| H8 | axe on Help home + article + skip link | No serious |

## 4. Execution notes

- Automated: `frontend` `npx playwright test e2e/help.spec.ts e2e/a11y.spec.ts`; `backend` `npx jest test/audit-28-rbac.e2e-spec.ts` plus unit.
- Live: walk each role home + Help click-through after screenshot regen (`cd frontend && npm run screenshots`).
- Production: `/api/health`, login, public scan, chat if API awake. Real mailbox remains blocked without `RESEND_API_KEY` / IMAP on Render.
