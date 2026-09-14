# NewVision — research pack (this chat)

**Ek file.** Is chat mein jo paanch Markdown reports bani thin, unka **poora text** yahan merge hai. Alag-alag files hata di gayi hain taaki repo mein duplicate na rahe.

| Part | Original filename | Topic |
|------|-------------------|--------|
| [1](#part-1) | `PRODUCT_GAPS_AND_ENHANCEMENTS.md` | Security leftovers, RBAC, email-not-live, scan-to-audit, seed/doc lies, ranked product backlog |
| [2](#part-2) | `UI_AND_CHAT_UPGRADE.md` | Why Team Chat is not a Teams replica; CSS/layout/composer/rail plan |
| [3](#part-3) | `ITIS_DAILY_PRACTICE.md` | Daily IT Admin / ITIS habits vs current source (password, OEM, mover, FAQ) |
| [4](#part-4) | `VENDOR_AND_TICKET_ENHANCEMENTS.md` | Vendor master (GSTIN/PAN, maker-checker) + helpdesk (attachments, follow-up, tags) |
| [5](#part-5) | `COMPANY_AND_CLIENT_GROWTH.md` | Company / clients / GTM: multi-tenant, 15-min aha, INR/GST |

**Date of this pack:** 14 Sep 2026.  
**Constraint that still holds:** investigation and planning only. Parts below did **not** change application code.

**Is pack mein kya nahi hai** (is chat mein nahi bani, isliye merge nahi): `QA_TEST_PLAN.md`, `RESEARCH_ADMIN_EFFICIENCY.md` (11 Sep — **stale**; Assign-to-me, macros `statusOnSend`, issue kits, bulk assign, My work, ticket presence, `lastAuditedAt` / `expectedReturnAt`, maintenance↔ticket FK already shipped), `FUTURE_IDEAS.md`, `DECISIONS.md`, `ENHANCEMENTS.md`, `AUDIT_28.md`.

**Kaise padhein.** Pehle yahan ki **Unified top 12** aur **Conflicts**. Phir jis topic ki zaroorat ho us Part ko. Har Part apna original heading structure rakhta hai.

**Cross-links.** Purani files ke beech ke Markdown links is pack ke `#part-1` … `#part-5` anchors par rewrite kiye gaye hain.

---

## Constraints that stay in force

- NewVision **light** tokens (`#1677FF` / `#0958D9`). No app-wide dark mode.
- **Tablet floor**, not a phone-width admin rewrite.
- Chat stays **staff-only** (Super Admin / IT Admin / IT Support).
- **No** calls, Teams federation, ServiceNow, Intune, AD, OCR, or supplier portal — already recorded in `FUTURE_IDEAS.md`.
- Help already escapes `ThemedLayout`; `/chat` does not (that is the layout root cause in Part 2).

---

## Unified top 12 (all five parts)

Pehle yeh — modules add karne se pehle.

1. **Email live.** Outbound is still `mailTransport: "console"`. IMAP / Resend were never proven. Inbound MIME does not extract attachments (Parts 1, 3, 4).
2. **Scan-to-audit.** `/scan/:code` is a public status card. Staff cannot stamp “I stood in front of this asset” from that page (Parts 1, 3).
3. **Notification targeting.** Warranty / “issue reported” rows use `userId` null and a **shared** `isRead`. One Employee “Mark all read” clears broadcasts for everyone (Part 1).
4. **RBAC leftovers.** Unscoped catalog APIs (`/departments`, `/locations`, `/asset-categories`, `/issue-kits`, location summary) and `GET /dashboard/setup` (estate counts + `mailTransport`) for every signed-in role (Part 1).
5. **Auth / internet hygiene.** Login rate limit, Helmet/CSP, public Swagger, JWT in `localStorage`, no login/logout audit (CERT-In), production still accepts seeded `Password123!` (Parts 1, 5).
6. **Ticket files = chat files.** Ticket upload still allows `application/octet-stream` and does not block `.html` / `.svg` / `.jar` the way chat does. Email-in must keep attachments (Parts 1, 4).
7. **India vendor master.** Separate GSTIN + PAN, GSTIN→PAN match, duplicate vendor, maker ≠ checker on bank, unique invoice per vendor, MSME 45-day clock. Repair `vendor` is still a free-text string (Parts 3, 4).
8. **Helpdesk daily loop.** Password/MFA playbook (not AD), follow-up ticket on closed (today reopens in place), close codes, tags, resolution SLA, employee how-tos (Parts 3, 4).
9. **ITIS physical / people loop.** OEM/RMA fields, employee move, offboard that closes tickets + chat, hostname/IMEI, licence seats (Part 3).
10. **Chat look, not chat features.** Feature-complete (Prompt 26). Replica miss is nested 216px sider + Ant Design composer. Escape layout; Compact-left rail; Fluent compose (Part 2).
11. **Honesty.** Seed brand/model mismatch, Employee identity vs login, Help still saying “no bulk assign”, stale `PROJECT_STATUS.md` (Part 1).
12. **If you want clients (not one estate).** Public site + INR price + GST invoice + import-first 15-minute aha + **multi-tenant** + trust pack. Do not lead sales with chat (Part 5). Single-tenant internal console is the current product.

**If selling is not the goal:** stop after 1–11. Part 5 is only for standing up a company.

---

## Conflicts (later Part wins for current source)

| Topic | Earlier text | Later text | Use |
|-------|----------------|------------|-----|
| Manager `GET /vendors` unmasks bank | Part 1 executive summary | Part 4: current `vendors.controller.ts` is `@Roles(SUPER_ADMIN, IT_ADMIN)` only | **Part 4** for current source. Part 1 may describe an older walk or a leftover `publicVendor(..., false)` path — re-verify before coding. |
| `RESEARCH_ADMIN_EFFICIENCY.md` gaps | Some older lists | Part 3: those items **shipped** | Do not rebuild Assign-to-me, macros, issue kits, bulk assign, My work, presence, audit timestamps, maintenance ticket FK. |

---

## Suggested build order (if you later ask to implement)

1. Trust: auth events, rate limit, Helmet, Swagger off in prod, demo password off, notification `userId` + per-reader read state, ticket upload allow-list.
2. Loops that already exist: live email, scan-to-audit, inbound attachments, follow-up-on-closed.
3. India AP + ITIS: GSTIN/PAN, unique invoices, maker-checker, password playbook, OEM case fields.
4. Chat replica CSS (Part 2) — after the product is honest, or in parallel if chat is the demo surface.
5. Company motion (Part 5) only when you are ready to take money from a second organisation.

---

## Parts (full original reports)


---

<a id="part-1"></a>

# Part 1 — Product gaps and leftover enhancements

_Merged from `PRODUCT_GAPS_AND_ENHANCEMENTS.md`. Text below is the original report._

# NewVision — Product gaps, weaknesses & enhancement report

**Prompt 31.** Investigation and reporting only. No application code was changed in this pass.

**How this was grounded.** Findings come from the current source tree (Prisma schema, Nest controllers/services, Refine pages, tests, and in-repo docs), from actually using the running local app as all five demo roles (REST as Super Admin / IT Admin / IT Support / Manager / Employee against `http://localhost:3000/api`, plus a same-day Playwright click-through of home and major routes for each role), from unauthenticated probes of production (`https://newvision-web.onrender.com` login chrome, `https://newvision-api.onrender.com/api/health`, `/api/docs`, `/api/public/assets/AST-PUN-LAP-0001`), and from comparable-tool / standards research (Snipe-IT hardware audit API, GLPI/Freshservice licenses, Zendesk agent collision, Precoro India P2P/GST, WCAG 2.2, OWASP ASVS 4.0.3, India DPDP Act 2023, CERT-In 28 Apr 2022 directions, E-Waste Management Rules 2022). Where docs and reality diverge, the live app or current source wins.

**Important live/source split.** Production already enforces Prompt 28 inventory RBAC (Employee `GET /api/accessories` → 403 in the prior production probe). The local Nest process during this investigation was a **stale `backend/dist/main.js` from 13 Sep 2026 16:20**, older than Prompt 28 source (`accessories.controller.ts` 23:02). Local Employee therefore received accessories/consumables lists (200) that current source would 403. This report treats **current source + production** as the product, and calls out the stale-dist situation as an operations weakness. Findings that reproduce in **current source regardless of dist age** (no `@Roles()`, missing `userId` on notifications, `publicVendor(..., false)`, ticket upload allow-list, etc.) are marked as such.

**This pass vs the first draft of this file.** The earlier draft was already honest about email, scan-to-audit, Prompt 28 leftovers, Manager UI, and doc drift. This rewrite adds material that that draft missed or under-weighted: broadcast notifications with a shared `isRead` flag, unscoped catalog APIs (departments / categories / issue-kits / location summary), India-specific compliance (CERT-In logs + Singapore hosting, DPDP subject rights, e-waste/ITAD), auth-event absence, login timing enumeration, seed/identity pollution, Employee My-devices and ticket-list empty chrome, and a longer, more concrete enhancement backlog.

---

## A. Executive summary

NewVision is a **working, unusually broad internal IT console** for a ~1,250-asset, three-office company. In one product it already combines serialized asset lifecycle, accessories/consumables, employee offboarding, a Spiceworks-style helpdesk with email-in *code*, vendor/PO/GRN/3-way match, contract renewals, Teams-style staff chat, QR scan, import/reconciliation, issue kits, onboard/offboard checklists, and five genuinely different role shells. That breadth is the main strength. An IT Admin can answer “who has what, where, warranty, and what’s in my queue this morning” without leaving the app. Role homes are real, not a CSS skin: Employee lands on **My IT**, Manager on **Your team**, IT Support on **Queue**, IT Admin/Super Admin on an estate dashboard.

It is **not** a mature, production-hardened ITAM/helpdesk/procurement suite. Maturity is closer to “strong internal demo that a small IT team could start using tomorrow, with several operational and security holes that would bite in the first month.” The biggest gaps are not missing enterprise ITSM (those were correctly declined). They are:

1. **Email is not a live system.** Outbound mail on the running local API is `mailTransport: "console"`. Production still accepts the seeded `Password123!` logins; Help and README both say real Resend/IMAP were never proven. Ticket HTML templates, IMAP poller, and digest de-dupe exist in code and tests — they do not exist as a proven inbox loop. Inbound MIME **does not extract attachments**.
2. **Physical audit is a poster, not a workflow.** `/scan/:code` is a public status card (good PII hygiene: no assignee, no serial). Staff cannot stamp “I stood in front of this asset” from the phone page. `Audit now` exists only on the authenticated asset show page. Snipe-IT’s daily audit-due loop (audit-by-tag, optional note, optional location update, next-audit date) is still the missing ITAM habit at this scale.
3. **Security and data-boundary leftovers remain after Prompt 28 — and some were never in that audit.** Prompt 28 closed several real IDOR-style holes (notes, search, accessories list, some reports). Still open in **current source**:
   - `GET /dashboard/setup` returns estate-wide counts and `mailTransport` to every signed-in role including Employee (verified locally 200: `assetCount: 1261`, `mailTransport: "console"`).
   - `GET /locations` has no `@Roles()` (Employee listed Bhopal/Pune/Hyderabad).
   - `GET /departments` has no `@Roles()` and returns **`employeeCount` per department** (Employee 200: Customer Support 152, Operations, …).
   - `GET /asset-categories` has no `@Roles()`.
   - `GET /locations/:id/summary` has no `@Roles()` (estate counts per office).
   - `GET /issue-kits` has no `@Roles()` (Employee 200: “Pune laptop standard” plus charger/mouse).
   - Managers can `GET /api/vendors` and `GET /api/vendors/:id`; `get()` returns **unmasked bank account numbers** (`vendors.service.ts` `publicVendor(vendor, false)`).
   - **Warranty and “issue reported” notifications are broadcasts** (`userId` null). Employee `GET /notifications` returned `Warranty expiring in 60 days … AST-HYD-LAP-0126 (HP HP G5 92) at HYD`. `isRead` is a **single column on the shared row**, so Employee “Mark all read” (`PATCH /notifications/read-all`) marks those broadcasts read for **everyone**, including IT Admin.
   - Ticket file upload still allows `application/octet-stream` and does not block `.html`/`.svg`/`.jar` the way chat does.
   - There is no login rate limit, no Helmet/CSP, Swagger is public in production (`GET /api/docs` → 200), JWT access tokens live in `localStorage`, password minimums are 6 on login/reset and 8 on user create, demo credentials are **pre-filled and printed on the login page**.
4. **Daily ITAM/helpdesk loops are still split across too many objects.** Support ticket, Maintenance ticket, Asset Request, Chat, and email-in are five front doors for “something is wrong / I need a thing.” Maintenance’s live queue is **108 total / 4 reported / 104 under_repair / 0 repaired / 0 reassigned**. Helpdesk presence (“X viewing”) exists as an in-memory 25s heartbeat, not a Zendesk-grade collision lock. Employee Home shows four open tickets; the Employee `/tickets` list in the live walk rendered **filter chrome with no rows**.
5. **Manager self-service is half-built.** The Manager home honestly shows “11 devices in your team” and “18 team tickets,” but `/assets` and `/employees` are **blocked by `RoleRouteGuard`**, so there is no UI to see those 11 devices. Team tickets work. Requisitions work (and honestly showed “No requisitions yet” under manager scope). The **Team devices KPI has no `href`**. `GET /reports/locations` is **estate-wide** in current source (`locationReport()` takes no actor) even though the banner says “Exports are limited to your team”; cards still say **“CSV · PDF · estate-wide”**.
6. **The demo estate is internally inconsistent, and documentation is drifting.** Login user `employee@newvision.local` is labelled **Esha Employee** in the sider; the linked employee row is **Rahul Kulkarni / EMP-01180 / `rahul.kulkarni.1180@newvision.local`**. Seed picks brand and model independently, producing **“Lenovo Apple Air 93”** (local scan) and **“Apple / Lenovo Air 86”** (production scan). Playwright leftover people (`Contract Followup…`) sort to the top of Employees. `PROJECT_STATUS.md` is explicitly stale after Prompt 20. In-app Help still says **“There is no bulk assign yet”** while the Assets toolbar has **Bulk assign**. README Playwright counts disagree with themselves (68 vs 80 vs 55 vs 22). Operators cannot trust the docs as a runbook.
7. **India-shaped compliance is almost entirely absent.** The company is Pune / Hyderabad / Bhopal. Hosting in `render.yaml` is **Singapore**. There are **no login/logout/auth-failure audit events** (CERT-In 180-day ICT logs, including authentication). There is no Data Principal export/erase path (DPDP 2023). Dispose/retire does not capture a CPCB recycler certificate or per-device wipe record (E-Waste Rules 2022 / ITAD practice). This is not “build a GRC module”; it is the minimum a real Indian IT team will be asked for in the first audit.

Net: **feature-complete for the original internal-IT brief, not production-ready as an internet-facing service, and not yet honest about a few things it claims.** The right next work is hardening, finishing the loops that already exist (email, audit stamps, manager drill-down, notification targeting, maintenance completion, upload/auth hygiene), deleting doc lies, and putting a thin compliance floor under logs/disposal — not adding ServiceNow.

---

## B. Missing features & capability gaps

Organized by module. Each item is tagged **Need** (this product’s scale: ~1,250 assets, a few offices, internal IT) or **Nice** (would help, not required to run the estate). Deferred items from `FUTURE_IDEAS.md` / `PROJECT_STATUS.md` §8 are marked **Deferred** so they are not silently re-proposed as new ideas.

### Assets

| Gap | What’s missing | Why it matters | Need vs nice |
|-----|----------------|----------------|--------------|
| Phone-side audit action | Public `/scan/:code` (`scan.tsx`, `PublicAssetsController`) is read-only. `lastAuditedAt` / `Audit now` live only on authenticated asset show. Snipe-IT’s `POST /hardware/audit` accepts `asset_tag`, optional `note`, optional `location_id`, optional `update_location`, optional `next_audit_date`. | Floor-walkers with a phone cannot stamp the asset they are looking at. That is the standard ITAM daily habit at this size. | **Need** |
| Audit-due working list | Dashboard My work includes a few unaudited rows. There is no dedicated “due this week” queue with scan-to-clear, and no email “audit due tomorrow.” | Snipe-IT’s upcoming-audits report is how a 1,250-asset estate actually gets walked. | **Need** |
| Manufacturer / model catalog | Brand and model are free-text strings. Seed picks brand and model **independently** (`prisma/seed.ts` ~629–630), producing live nonsense such as **“Lenovo Apple Air 93”** (local scan, Playwright walk) and **“Apple / Lenovo Air 86”** (production `AST-PUN-LAP-0001`). Warranty broadcast copy then becomes **“HP HP G5 92”** (brand concatenated onto a model that already contains a brand). | Filters, kits, and reports cannot group “all ThinkPads.” Bad seed makes every demo look unfinished. | **Need** (at least fix seed pairing); catalog is **Nice** |
| Identity fields on laptops/phones | No hostname, MAC, IMEI, phone number, or OS build. Snipe-IT exposes several of these as default or custom fields; GLPI inventories them via agent (agent is **Deferred**). | Helpdesk “which laptop is `NV-LAP-044` on the network?” is a daily L1 question. CSV columns would be enough; no discovery agent. | **Need** (a handful of optional strings) |
| Asset photos / condition photos | No image on the asset. Snipe-IT and GLPI attach photos. | Floor disputes (“this was already cracked”) and insurance. One photo at assign + one at return is enough. | **Need** for custody; gallery is **Nice** |
| Software / SaaS licenses as inventory | `HandoffKind.license` and `VendorContractType.license_subscription` exist; `entitlementCount` / `usageCount` are numbers on the contract; `VendorContractAsset` links hardware, not people. There is no first-class License/seat object like Snipe-IT Licenses or GLPI Licenses (who holds which M365/Adobe seat). | Office 365 / Adobe seats are a real IT Admin job at 1,180 people. Contracts track a vendor SLA, not “who has a seat.” Freshservice SLM is overkill; a seat table on the existing contract is not. | **Need** (lightweight seats), not a CMDB |
| Components (RAM, SSD inside a laptop) | No Component model. Snipe-IT separates Assets / Accessories / Consumables / **Components** / Licenses. | Nice for repair shops; optional at 1,250 mostly-laptops. | **Nice** |
| Depreciation / book value | `purchaseCost` exists; no depreciation schedule or NBV. | Finance may want it yearly; IT can live on purchase cost + warranty. | **Nice** |
| Expected check-in automation | `expectedReturnAt` on assign exists; **does not auto-check-in** (by design). No email “loaner due tomorrow.” Employee My devices cards do not show due-back. | Loaners become permanently assigned. Overdue only appears on My work. | **Need** (nudge/email), auto-check-in stays out |
| Reservation / hold of available stock | Status `pending_assignment` exists; there is no “hold this laptop for Rahul starting Monday.” | New-hire kits race two admins. Issue kits partially cover this. | **Nice** |
| Checkout to location (not person) | Assign is employee-only. Snipe-IT can check out to a location (conference room / store). | Shared meeting-room PCs. | **Nice** |
| User acceptance / EULA / custody PDF on checkout | Snipe-IT optional e-sign. NewVision assign is IT-only, no PDF. | Custody disputes. A one-page “I received AST-…” emailed PDF is enough. | **Nice** (small) |
| Lost / stolen workflow | Status `lost` exists. No FIR/police reference, no “wipe requested”, no insurance claim number. | A stolen laptop is a process, not a dropdown. | **Need** (three optional strings + a help article), not MDM |
| Dispose / e-waste / ITAD | Status `disposed` exists. No recycler name, no CPCB registration id, no wipe certificate, no batch recycling certificate. Indian ITAD practice (NIST 800-88 wipe cert per serial + CPCB batch cert) is what auditors ask for under **E-Waste (Management) Rules, 2022**. | A spreadsheet of “we sold it to a kabadiwala” will fail the first ESG/IT audit. | **Need** (fields + file attach on dispose), not a recycling marketplace |
| Custom fields | None. **Deferred** (`FUTURE_IDEAS.md`). | Snipe-IT custom fields are how odd attributes (BitLocker, IMEI) land without schema churn. Prefer a few named columns first. | **Deferred / Nice** |
| Network discovery | None. **Deferred.** | Correct for this scale; CSV/import is the intake. | **Deferred** |
| Merge duplicate assets | `POST /assets/:id/duplicate` exists; there is no merge. | Playwright and receiving without serials create junk AST rows. | **Nice** |

### Employees

| Gap | What’s missing | Why it matters | Need vs nice |
|-----|----------------|----------------|--------------|
| Super Admin has no employee row | Live `superadmin@newvision.local` → `employeeId` empty. Ticket create requires `raisedByEmployeeId` or `actor.employeeId` (`tickets.service.ts`). | Sara Admin cannot raise a ticket as herself without picking someone else. Dashboard copy also says “your locations.” | **Need** |
| Demo identity is split | Login **Esha Employee** / `employee@newvision.local` is linked to employee **Rahul Kulkarni EMP-01180** (`rahul.kulkarni.1180@newvision.local`). Requests grid shows Rahul. Home sider shows Esha. | Every reviewer thinks RBAC is broken. It is a seed bug. | **Need** |
| Manager cannot open team people/devices | API scopes employees/assets to the team (current source). UI `navForRole('MANAGER')` omits `/employees` and `/assets`; `RoleRouteGuard` bounces those URLs home. Home shows “11 devices” with **no href** on the Team devices KPI (`dashboard.tsx` `ManagerHome`). | Manish can approve requests and see team tickets, but cannot browse the 11 devices the KPI advertises. Help claims managers can read team assets. | **Need** |
| Offboarding does not finish JML | `POST /employees/:id/offboard` returns/reassigns assets, checks in accessories, deactivates the User. It does **not**: close or reassign open support tickets, remove chat memberships, unassign license seats (none exist), tick the offboard checklist, or record a data-wipe. Checklists are a separate Settings toy (`VPN / MFA`, `ID badge` as labels only). | A leaver with four open Excel tickets (the demo employee) stays in the queue. Spiceworks-class tools at least close or reassign the person’s tickets. | **Need** (tickets + login already; licenses when they exist) |
| Org chart / N+1 manager depth | `managerId` is a single parent. No skip-level, no dotted line. | Fine for this RBAC model. | **Nice** |
| Photo / HR fields | No photo, no cost centre beyond department, self-edit is phone/title only. | Directory completeness. | **Nice** |
| Data Principal export / erase | No “download my data” / “erase me” path. DPDP 2023 gives employees access, correction, and erasure (with legal-hold exceptions). Offboard currently **keeps history** (correct for ITAM) but never explains retention. | First DPDP questionnaire from Legal. A Super Admin export of one employee’s profile+history JSON plus a documented retention note is enough. | **Need** (export + policy copy); auto-erase is **Nice** and dangerous for audit |
| Live AD/HR sync | Manual CSV reconciliation only. **Deferred.** | Correct. The gap is a **calendar nudge** to run reconciliation, not Entra. | Nudge = **Need**; sync = **Deferred** |
| Employee cannot report repair from nav | No Maintenance item on My IT. Help says report on the assigned asset. Asset show is allowed (`/assets` prefix) but **My devices was an empty card** in the live walk while Home showed `AST-BHO-LAP-0064`. | Broken laptop vs ticket vs request is already confusing (Help `my-it`). A blank My devices page makes the help path unreachable. | **Need** (fix the empty page + one “This device is broken” on the card) |

### Accessories / consumables

| Gap | What’s missing | Why it matters | Need vs nice |
|-----|----------------|----------------|--------------|
| Serialized accessories | Quantity buckets only. A tagged docking station cannot have its own serial. | Some docks/monitors should be assets; the module is correct for mice/chargers. | **Nice** (document when to use Asset instead) |
| Reorder point / PO from low stock | Low-stock notification is correctly targeted at Super Admin + IT Admin (`consumables.service.ts` `notifyLowStock`). No “create PR from this SKU.” | Closes the loop from 2 remaining HDMI cables to a requisition. | **Nice** (small) |
| Barcode on accessory SKUs | QR is asset-only. | Warehouse picking. | **Nice** |
| Consumable request quantity | Asset requests can name an accessory; consumable issue is IT-driven. Snipe-IT “requestable consumables.” | Employees already have Requests. | **Nice** |
| Issue-kit API is public-to-any-login | `GET /issue-kits` has no `@Roles()`. Employee 200. | Kit composition is mild, but it is the same “UI hide ≠ API” class Prompt 28 was meant to kill. | **Need** (restrict to IT Admin) |

### Maintenance (hardware repair)

| Gap | What’s missing | Why it matters | Need vs nice |
|-----|----------------|----------------|--------------|
| Vendor is free text | `AssetMaintenance.vendor` is `String?`, not `Vendor`. Asset itself has **both** `vendor` string and `vendorId`. Seed fills the string. | Spend and scorecards cannot include repair vendors. Procurement vendors sit in another module. | **Need** |
| Repair completion in the demo estate | Live Maintenance: **108 total, 4 reported, 104 under_repair, 0 repaired, 0 reassigned.** KPI Under Repair 107. Seed creates every `under_repair` asset as an open ticket and never completes any. | The queue looks like a parking lot. Completing a repair is the point of the module. | **Need** (seed + UX: make “Mark repaired” obvious) |
| Parts / loaner auto-link | Optional `supportTicketId`. No parts lines. Loaner is a separate assign. | Printer ticket + laptop under_repair remain two records (by design). | Link is enough; parts = **Nice** |
| Repair SLA / calendar | Dates exist; no calendar view, no vendor booking. | **Nice** | |

### Requests (hardware)

| Gap | What’s missing | Why it matters | Need vs nice |
|-----|----------------|----------------|--------------|
| Fulfilment does not record the issued asset | Status `fulfilled` is a human mark (`fulfill()` sets `fulfilledById` / `fulfilledAt` only). No `fulfilledAssetId`. Issue kits are a separate Settings action, not a button on the approved request. | Audit of “what did we actually give Rahul?” lives only in assign history, not on the request. | **Need** |
| Single-step only | `pending → approved\|rejected → fulfilled`. **Deferred** workflow engine. | Fine. Gap is IT Support seeing Requests in the sidebar with **no approve/fulfill permission** — a dead nav item (live Support walk: Requests badge `1`, grid visible, no fulfill). | Nav cleanup = **Need**; engine = **Deferred** |
| Quantity / multi-item | One kind + optional category/name. | Kits cover the new-hire case better. | **Nice** |

### Helpdesk / tickets

| Gap | What’s missing | Why it matters | Need vs nice |
|-----|----------------|----------------|--------------|
| Knowledge base / suggested articles | None. **Deferred.** | Spiceworks/JSM deflect password-reset volume. NewVision Help is staff-oriented docs, not a requester KB. | **Deferred**; a short employee FAQ in Help is **Need** |
| SLA breach automation | First-response targets in Settings; overdue is visual. Clock pauses on `waiting_on_employee`. **Deferred** escalation engine. Live Support Queue showed overdue `TCK-000075` Outlook, `TCK-000079` Excel. | Correct for this size if someone watches My work. Missing: email when *my* ticket goes overdue. | Email-on-overdue = **Need**; rules engine = **Deferred** |
| Agent collision | `POST /support-tickets/:id/presence` + “X viewing” tag. In-memory `Map`, 10s heartbeat, pruned ~25s. No typing lock, no “take over,” no view-list eye icon (Zendesk collision is the pattern; not on Zendesk Team plans). | Two staff can still double-reply. `commentBusy` prevents double-click on one Send button (Prompt 28 A10) — not two agents. Multi-instance Render would drop the map on every deploy. | **Nice** (strengthen), not missing |
| Merge/split | One-way duplicate-of. **Deferred.** | Enough. Live Employee home showed **TCK-000091 / 092 / 093 all “Cannot open Excel”** — the product needed duplicate-of and nobody used it, or seed/tests created clones. | Use existing duplicate-of; seed hygiene = **Need** |
| CSAT reminders | Rate once; no re-send. **Deferred.** Zendesk/JSM both nag. | CSAT will stay near-zero without a reminder. | **Nice** |
| Business hours | None. **Deferred.** | First-response minutes count nights. | **Nice** |
| CC / additional requesters | Watchers exist (employees). No free-text CC. | Email-in unmatched senders are a flag, not a CC. | **Nice** |
| Super Admin ticket create | Blocked without an employee link (see Employees). | **Need** | |
| Ticket analytics | `/tickets/reports` exists for staff. No CSAT trend, no first-response histogram in the main Reports grid. | Live queue is small (~19 tickets / 4 in Support sider). | **Nice** now, **Need** later |

### Email-in

| Gap | What’s missing | Why it matters | Need vs nice |
|-----|----------------|----------------|--------------|
| Proven mailbox | IMAP poller + webhook implemented (`email-inbox.service.ts`). Production/local: no `IMAP_HOST`. Help still says “local default is not polling.” Prompt 27 left this unchecked. | Without this, “employees reply to tickets” is fiction. Copy-email-to-Outlook is the real path. | **Need** (ops), not new code |
| Inbound attachments | `email-parser.ts` handles `text/plain` and first HTML part of multipart. **No attachment extraction** (no `multipart` file parts stored as `TicketAttachment`). | Users attach screenshots to mail. Those never become ticket files. Zendesk/JSM treat this as table stakes. | **Need** |
| HTML sanitization of inbound body | Parser strips quoted reply; not a full HTML sanitizer. Ticket comments render as `whiteSpace: pre-wrap` **text** (good — not `dangerouslySetInnerHTML`). | Stored HTML is unused on the ticket show page today. If someone later renders `parsed.html`, it becomes XSS. | **Need** to keep rendering text-only; treat HTML as unsafe |
| Ingest webhook secret compare | `EMAIL_INGEST_SECRET` uses `secret !== configured` (`email-inbox.controller.ts`). Webhook HMAC uses `timingSafeEqual` (`webhooks/signature.ts`). | Timing-unsafe compare on a public webhook. | **Need** (tiny) |
| Multi-mailbox / Slack | **Deferred.** One shared mailbox is the design. | Correct. | **Deferred** |

### Chat

| Gap | What’s missing | Why it matters | Need vs nice |
|-----|----------------|----------------|--------------|
| Managers / employees excluded | Staff-only by design. API 403. UI bounces home. | Hallway questions from employees still become tickets or WhatsApp. That is intended. The gap is there is **no “ask IT” lightweight path** except tickets. | By design; employee FAQ / ticket templates = **Need** |
| Pin / bookmark / forward | **Deferred.** Search, mute, small-DM read receipts exist. | Fine. | **Deferred** |
| Calls / Teams federation | **Deferred.** | Fine. | **Deferred** |
| Channel hygiene | Live `#it-ops` is polluted with **“Bubble ping …” / “Prompt24 ping”** test messages. `#helpdesk` and `#procurement` show “No messages yet.” | Looks like an abandoned prototype, not a staff workspace. | **Need** (seed/moderation), not a feature |

### Vendor / procurement

| Gap | What’s missing | Why it matters | Need vs nice |
|-----|----------------|----------------|--------------|
| GST / TDS / e-invoice | `taxAmount` + INR defaults. No GSTIN breakup, no IRN. Precoro’s India pitch is line-level CGST/SGST/IGST + GSTIN/place-of-supply. Zoho Books still owns filing. | Finance still lives in Tally/Zoho. NewVision should not pretend to file GST. Gap is **export a clean bill CSV** for the accountant. | Export = **Need**; GST engine = **Nice / out of finance scope** |
| Manager vendor API | `VendorsController` `@Roles(ADMIN, MANAGER)` on list/get; `assertRead` allows MANAGER; `get()` unmasks bank. UI hides Vendors (`RoleRouteGuard` bounces `/procurement/vendors`). | Prompt 28 closed *search* for vendors; **list/get did not**. Bank numbers are the highest-fraud field in this module (`DECISIONS.md`). | **Need** (security) |
| Payment execution | Status only (`InvoicePaymentStatus`). Help correctly warns. **Deferred** GL/payments. Dell seed `paymentTerms: "Net 45"` is a string; `netDays()` parses it for overdue math. No MSME flag, no statutory 45-day-from-acceptance clock. | Fine as status. MSME delayed-payment interest is a Finance problem unless they ask. | **Deferred**; MSME flag = **Nice** |
| PunchOut / supplier portal / OCR / e-sourcing | **Deferred.** | Fine. | **Deferred** |
| RFQ comparison UX | `RequisitionQuote` exists; live demo has one test PR and one draft PO. Thin UI for comparing quotes. Manager requisitions: **“No requisitions yet.”** | Real buying still happens on email. The module looks like a stub because **demo data is a stub**, not because the state machine is missing. | Demo data = **Need**; comparison UX = **Nice** |
| Serial capture at GRN | Handoff can create assets; serials still typed later. | Receiving 20 laptops without serials creates junk AST rows (`NV-REN-98964` / `E2E-RENAME-…` already pollute the admin asset list). | **Need** |
| Budget remaining | `budgetHead` text, no budget ledger. Precoro-style remaining budget is mid-market procurement. | Nice until Finance asks. | **Nice** |

### Reports

| Gap | What’s missing | Why it matters | Need vs nice |
|-----|----------------|----------------|--------------|
| Scheduled emailed reports | Manual download only. | Monday warranty PDF to IT Admin is a Snipe-IT habit. | **Need** (cron + existing mailer), not a BI tool |
| Manager card copy + location report | Reports page body says team-scoped; cards still say **“CSV · PDF · estate-wide”** (`reports.tsx` `buildReports`). `locationReport()` is **unscoped** in current source — Manager CSV is the full three-office breakdown (verified locally: BHO 237 employees / 266 assets, HYD 450/474, PUN 502/521). | Managers will think they are leaking the estate — and for **locations**, they actually are. | **Need** |
| IT Support financials | Support Reports still offers Asset Report “estate-wide” including **Cost (INR)** and serials. Source `assertAllowed` blocks vendor spend; asset CSV is allowed. Assets list **Cost** column is visible to Support (`assets/list.tsx`; `canManage` is only Super Admin / IT Admin, but Cost is not gated). | L1 seeing purchase price / invoice is often unwanted. | **Need** (hide cost) / **Nice** if the company does not care |
| Growth / trends UI | `/api/dashboard/trends` exists, IT-staff only in source; **removed from the home UI** in Prompt 20. | Not a gap unless someone wants a board slide. | **Nice** |
| Disabled Reset on reports | Filter banner **Reset** is `disabled`. | Looks broken. | **Need** (tiny: hide it) |

### Audit log

| Gap | What’s missing | Why it matters | Need vs nice |
|-----|----------------|----------------|--------------|
| Auth events | `AuditLog` records asset/employee/procurement mutations. **Login, logout, failed login, refresh reuse, password change are not written.** | CERT-In 28 Apr 2022: covered entities keep ICT logs (including authentication) **180 days in India**. OWASP ASVS 8.3.5: accessing sensitive data is audited. A public Render login with printed passwords and **zero login trail** is the opposite. | **Need** |
| Export of the audit log | DataGrid CSV of the loaded page, not a server-side full export. | Compliance “give me 90 days of changes.” | **Need** |
| Retention policy | Append-only, unbounded. No documented hold vs erase (DPDP vs ITAM history). | Postgres growth is fine at this size; Legal will ask anyway. | **Nice** (keep forever at this scale for a while; **write the policy**) |
| Editing entries | Forbidden by design. **Deferred.** | Correct. | **Deferred** |

### RBAC

| Gap | What’s missing | Why it matters | Need vs nice |
|-----|----------------|----------------|--------------|
| `Permission` table unused at runtime | Prisma `Permission` / `Role.permissions` exist; guards use hardcoded `ROLE_PERMISSIONS` + `@Roles()`. Settings “Your permissions” is a static list from `/auth/me`. Live IT Admin walk showed **“No explicit permissions listed for this role”** (likely `/auth/me` race, still a UX defect). Super Admin and Support listed tags. | Custom roles look possible in the schema and are not. | **Nice** (don’t pretend the table is a product) |
| IT Support + Requests | Nav includes Requests; no `request:approve` / fulfill. | Dead-end. | **Need** (hide or grant view-only copy) |
| Catalog endpoints default-open | Locations, departments, categories, issue-kits, dashboard setup: authenticated with **empty `@Roles()`**. `RolesGuard` treats “no roles required” as allow. | Prompt 28 taught UI-hide ≠ API. These were missed. | **Need** |
| Saved views shareable by any login | `SavedViewsController` has no `@Roles()`. `create()` accepts `isShared: true` from any actor. Live list included **`E2E view 1789296892536`** visible to Employee. | Filter spam / confusion, not a data leak by itself. | **Need** (IT-only shared views) |
| Financial fields for IT Support | Asset list Cost + asset CSV cost/serial. | Often unwanted. | **Nice** / **Need** if Finance objects |

### Notifications

| Gap | What’s missing | Why it matters | Need vs nice |
|-----|----------------|----------------|--------------|
| Broadcast model is unsafe | `Notification.userId` nullable + `isRead` on the same row. Warranty (`warranty-alert.service.ts`) and issue-reported (`maintenance.service.ts`) create **no userId**. List/mark-read treat `userId null` as visible to **every** role. Low-stock and contract-renewal correctly fan out to IT user ids. | Employee sees other offices’ warranty codes. Employee “Mark all read” clears IT’s unread warranty bell. This is a **real bug**, not a missing feature. | **Need** |
| Event coverage | Warranty, tickets, chat, procurement, low stock, requests — in-app. Email only when transport is live and for ticket lifecycle (+ digest). Loaner due, audit due, reconciliation reminder, “your request was fulfilled” (in-app exists; email thin). | If SMTP/Resend is off, the bell is the product. The bell is easy to ignore **and currently leaks**. | **Need** once targeting is fixed and mail works |
| Template branding | **Deferred.** | Fine. | **Deferred** |

### Help / docs

| Gap | What’s missing | Why it matters | Need vs nice |
|-----|----------------|----------------|--------------|
| Help vs product | Bulk assign documented as absent (`articles.ts` `assets-bulk`); exists. `PROJECT_STATUS.md` stale after Prompt 20. README test counts conflict (68 / 80 / 55 / 22 Playwright). `PROJECT_DOCUMENTATION.md` still describes `accessToken` (actual field is `access_token`). | People follow Help. | **Need** |
| Employee-oriented Help | Most articles are admin. `my-it` is short. No “VPN is down” self-help. | Deflects tickets. | **Need** (small) |
| Skip link only on Help | `nv-skip-link` in `HelpSection.tsx` only. Authenticated chrome has no skip-to-content. WCAG 2.4.1. | Keyboard users skip a 216px sider every time. | **Need** (a11y) |

### Admin / settings

| Gap | What’s missing | Why it matters | Need vs nice |
|-----|----------------|----------------|--------------|
| IT Support Helpdesk vs email-in status | Support Settings tabs: Account + Helpdesk. `GET /email-in/status` is Super Admin / IT Admin only; UI `.catch`s to null. Support can edit canned (staff endpoints) but mailbox status is blank. | Confusing. | **Need** (hide mailbox card for Support) |
| Session / device list | No “signed in on these browsers.” Refresh rotation exists; **one refresh hash per user** — a second login silently invalidates the first device. No reuse detection / family revoke. | Stolen refresh. Also: IT Admin on desktop + phone will keep getting kicked. | Concurrent sessions = **Need** (UX); reuse detection = **Nice** |
| Idle timeout | Access JWT 15–30m + refresh 7d. No client idle lock. | Unattended kiosk at reception. | **Nice** |
| MFA | None. **SSO deferred.** | Demo password on a public Render URL is the real issue. | MFA **Need** before any non-demo production; SSO **Deferred** |
| Checklists are labels | Onboard items `Issue laptop`, `Create login`, `VPN / MFA`, `ID badge` are strings. Starting a checklist writes `doneById: actor.id` on **every new item even when `done` is false** (`checklists.controller.ts`). | Looks like a JML product; it is a sticky note. The `doneById` write is a data-integrity bug. | Fix `doneById` = **Need**; wiring to real actions = **Nice** |

---

## C. Weaknesses & rough edges in what already exists

These are present, but weak, fragile, inconsistent, or worse live than the docs claim.

### Real bugs / misbehaviour

1. **Help lies about bulk assign.** `frontend/src/help/articles.ts` (`assets-bulk`): “There is **no bulk assign** yet.” Assets list toolbar has **Bulk assign** (`assets/list.tsx`). Classification: **docs bug**.
2. **Manager vendor get returns full bank numbers.** `vendors.service.ts` `get()` → `publicVendor(vendor, false)` leaves `bankAccountNumber` unmasked. List path masks (`••••` last 4). Managers are allowed to GET by id. Classification: **security bug**.
3. **`GET /dashboard/setup` is any authenticated user.** Local Employee received `assetCount`, `employeeCount`, `mailTransport`, `seedOnStart`. Estate size and mail stack are not Employee data. Classification: **data-exposure bug** (Prompt 28 missed this one).
4. **Catalog GETs have no `@Roles()`.** Employee listed offices, departments **with headcount**, asset categories, and issue kits. `GET /locations/:id/summary` returns per-office asset/employee counts. Classification: **data-exposure**; department headcount is the most sensitive of these.
5. **Warranty and issue-reported notifications are broadcasts; `isRead` is global.** Employee notification list included other sites’ asset codes. `markAllRead` updates every `userId null` row. Classification: **security bug + data-integrity bug**.
6. **Manager cannot open team assets/employees in the UI** while KPIs count them. Classification: **product bug** (API yes, UI no).
7. **Manager location report is estate-wide** in current source. Banner claims team scope. Classification: **security / copy bug**.
8. **Change-password does not revoke refresh tokens.** `AuthService.changePassword` updates `passwordHash` only. Reset-password *does* clear refresh. ASVS 3.3.3 wants other sessions terminated on password change. Classification: **auth bug**.
9. **Ticket attachments weaker than chat.** `tickets.service.ts` `addAttachment`: blocked ext set omits `.html/.htm/.svg/.jar/.sh`; `application/octet-stream` is allowed. Attachment download sets `Content-Disposition: attachment; filename="${row.filename}"` with **no sanitization** (CRLF / quote injection into headers). Chat `chat-files.ts` was hardened in Prompt 28. Classification: **security inconsistency / bug**.
10. **Login form prefills IT Admin + `Password123!` and prints all five demo accounts** (`login.tsx`). Same SPA is what production serves. Classification: **production security bug** if this host is the real tenant.
11. **Swagger is unauthenticated in production.** `GET https://newvision-api.onrender.com/api/docs` → 200. Classification: **info disclosure**.
12. **Seed brand/model independence** produces physically impossible names. Public scan shows them. Classification: **data-quality bug**.
13. **Demo user/employee identity split** (Esha vs Rahul Kulkarni). Classification: **seed bug**.
14. **Employee “My devices” page rendered as an empty card** in the live walk (`/assets` snippet `"My devices "`) while Home showed `AST-BHO-LAP-0064`. Same `AssetList` uses `syncWithLocation: true`; leftover query params (`pageSize`/`currentPage`) plus a loading/empty race are the likely cause. Classification: **UX bug**.
15. **Employee `/tickets` list showed filter chrome and no rows** while Home listed TCK-000090–093. Classification: **UX bug**.
16. **Super Admin dashboard flashed Total Assets 0 / “Refreshing…”** immediately after login (IT Admin’s home then showed 1,261). Classification: **UX bug** (loading/empty indistinguishability).
17. **Local API process can be hours behind source.** `dist/main.js` 16:20 vs `accessories.controller.ts` 23:02. Employee accessories 200 locally, 403 in current source. Classification: **ops bug**.
18. **Login timing enumeration.** `validateUser` throws *before* `bcrypt.compare` when the user is missing or inactive. Existing users pay ~100ms of bcrypt. Forgot-password hashes a token only when the address matches. Classification: **auth weakness / user enumeration**.
19. **Checklist items stamped `doneById` on create** even when not done. Classification: **data-integrity bug**.
20. **Search for “Kabir” returns 20 employees** (cap `take: 20`) against a seed full of Kabirs. Palette then looks complete when it is not. Classification: **weak, can hide people**.
21. **Warranty notification title/body concatenates brand twice** and drops a closing parenthesis (`warranty-alert.service.ts`). Classification: **copy bug**.
22. **Reports Reset button is permanently disabled.** Classification: **UI bug**.
23. **Page title is `NewVisionITIS`** (`index.html`, `App.tsx` DocumentTitleHandler, Sign-out copy). Classification: **branding bug**.
24. **Login estate panel is fiction.** Hardcoded `1,250` / `1,180` / `98.2% Records reconciled` (`login.tsx` `ESTATE`). Live estate is 1,261 / 1,189 locally and 1,253-class on production; reconciliation % is not computed. Classification: **docs/UI lie**.

### Weak-but-working

- **Public scan** correctly omits serial/assignee; still shows **expired warranty in days** (“Expired 213 days ago” local / production −152 days) plus **condition** (`fair` on production). A photographed sticker leaks “this laptop is out of warranty / in fair condition,” which is milder than serial but not nothing. Local scan said **Assigned**; production JSON said **`assigned: false` / `available`** for the same code — seed drift across environments.
- **Public codes are enumerable.** `AST-{LOC}-{CAT}-{SEQ}` is sequential. `/api/public/assets/AST-PUN-LAP-0001` works unauthenticated. A loop of 0001–0500 maps the Pune laptop fleet’s status and warranty. Physical-sticker access control does not hold once the pattern is known.
- **Maintenance vendor** is a string; **104 repairs stuck in under_repair**. The lifecycle code is fine; the operational dataset is not.
- **My work** for IT Support showed **36 items** and several overdue tickets. The list is a mixed pile of tickets + repairs + follow-ups — better than Prompt 20’s attention cards, still not a personal queue you can snooze.
- **Ticket presence** is a heartbeat, not a lock. Two tabs can both reply.
- **CSAT** exists; no reminder. Ratings will be rare.
- **Email-in unmatched sender** flags exist; nobody has a UI work queue titled “link this stranger” beyond the ticket chip.
- **Import jobs** are `setImmediate` + `bytea` on the API process. A Render Free restart mid-job loses in-flight work. Rollback deletes recorded IDs only. Documented; still fragile.
- **Webhooks** deliver in-request with a 2.5s timeout, no retry queue. Events are only `asset.created` and `asset.status_changed` — no ticket, PO, or assign events. Fine for 0–2 subscribers; silent loss if the consumer is down.
- **Chat attachments in Postgres `bytea`.** 8 MB × many images will bloat Hobby Postgres (1 GB, 30-day free expiry).
- **JWT in localStorage** (or sessionStorage if “Keep me signed in” is off). XSS = account take. OWASP ASVS **8.2.2** (L1): browser storage must not contain sensitive data. Standard SPA tradeoff; no CSP/Helmet to reduce XSS. Google Fonts loaded from `fonts.googleapis.com` / `fonts.gstatic.com` also widen the CSP problem.
- **Password policy:** login/reset `@MinLength(6)`, create user 8, bootstrap docs 12. `Password123!` is the demo. No complexity, no breach check (ASVS 2.1.7), no lockout (ASVS 2.2.1: ≤100 failed attempts/hour).
- **One refresh token per user:** second device wins; first gets 401 on refresh with no “signed out elsewhere” copy.
- **Forgot-password link** includes `uid` in the query string (`/reset-password?uid=&token=`). Token is hashed at rest (good); uid enumerates user ids. ASVS 8.3.1: sensitive data not in query strings.
- **Command palette** is role-filtered for nav/actions (Prompt 22). Deep links still search whatever `/search` returns. Employee searching `PUN` still gets locations (search controller does not scope locations) — consistent with the unscoped locations API.
- **IT Support Reports / Assets Cost column** — financials leak via the “normal” asset report.
- **Chat** left/right bubbles, threads, mentions, presence shapes — still present. Quality issue is **test garbage in `#it-ops`**, empty default channels, and no employee access (by design).
- **Procurement demo data** is a single “Test PR for manual-edit” / `PO-000001` draft ₹50,000 / two vendors (Dell, Microsoft). Bank column on the Vendors grid showed **—** (masked/empty in the walk). The module is far more complete than the data.
- **Employees list sorts by `id desc`:** Playwright `Contract Followup1789297019629` is the first row an IT Admin sees. The 1,180-person directory looks like a test dump.
- **Saved views** polluted with `E2E view 1789296892536` marked shared.
- **Asset list for admins** includes `NV-REN-98964` / `E2E-RENAME-…` at the top (id desc).
- **Employee asset GET** returns `purchaseCost` `116667`, `serialNumber`, `invoiceNo`. Asset show **always** renders Purchase Cost / Invoice No (not gated on `canManage`). Fine for “my laptop cost”; not fine if invoice numbers are treated as finance-sensitive.
- **`docker-compose.yml`** still sets `JWT_EXPIRES_IN: 8h` while `.env.example` says 15m and Prompt 20 decided 15–30m + refresh. Compose `SEED_ON_START: "true"` without `SEED_IF_EMPTY`. Local Docker can wipe edits and issue long-lived tokens. Postgres password is `newvision` on a published 5432.
- **`render.yaml` `ipAllowList: []`** on Hobby Postgres — database is not IP-restricted.
- **Axe-core** covers dashboard, assets, tickets, raise-ticket, notes, Help, chat — **IT Admin only** (`a11y.spec.ts` `login()` defaults to IT Admin). Employee/Manager/Support shells, procurement, scan, login are not in the axe gate. `aria-hidden-focus` is **disabled**. Ant Design Table keyboard/filter issues are a known upstream problem (filter triggers historically `tabIndex={-1}`; virtual tables drop `<tr>` semantics — antd #58131, #53819). DataGrid is the core UI.
- **DataGrid** is Excel-grade on admin lists; Employee devices are cards; Accessories default to cards. Density is inconsistent on purpose, but keyboard shortcuts (J/K) were extended to procurement lists only — accessories/consumables/requests/maintenance still expand-in-place without queue keys (`ENHANCEMENTS.md` E1).
- **Health check** is `{ ok: true }` with **no Postgres ping**. Keep-alive can succeed while the database is down.
- **`ValidationPipe` `forbidNonWhitelisted: false`** — extra JSON fields are silently stripped (`whitelist: true`), never rejected. Weak API contract; not a hole by itself.
- **Issue-reported broadcast** includes the free-text `issue` field. An employee typing a password into a repair note notifies the whole company.
- **Google Fonts at runtime** from Google (not self-hosted). Extra third party on every page; CSP-hostile.

### Docs vs reality (verified)

| Claim | Reality |
|-------|---------|
| Help: no bulk assign | Bulk assign button exists |
| `PROJECT_STATUS.md` as current gap audit | File header: stale from Prompt 20 onward |
| `PROJECT_DOCUMENTATION.md` as architecture | Header: not rewritten for 20–25; still mentions `accessToken` |
| README Playwright **68** and later **80** / **55** / **22** | 23 spec files under `frontend/e2e/`; counts in README/PROGRESS disagree |
| Prompt 27: production email | `RESEND_API_KEY` still operator-supplied; local `mailTransport: "console"` |
| Prompt 26: chat complete | Feature-complete; **content** in `#it-ops` is test pings |
| AUDIT_28: vendors stay admin in search | Search yes; **REST list/get still allow Manager** |
| Public scan: no serial/name | True. Brand/model/location/warranty/**condition** still public |
| Login: “NewVision Softcom directory account” | There is no directory. Copy is pretend-SSO |
| Login: 98.2% records reconciled | Hardcoded fiction |
| Help: articles cover every screen accurately | Bulk assign, and several Prompt 23–28 surfaces, are stale |
| Settings “Your permissions” | Decorative; IT Admin walk showed empty |

---

## D. Quality dimensions — an honest read on each

### UI/UX & consistency

**State:** Visually coherent light admin (Prompt 12/19 tokens, custom 216px sider, chip filters, DataGrid). Role shells are the best UX decision in the product. Live sider labels actually change: MY IT / TEAM / Queue / Dashboard.

**Shortcomings:**

- Three ways to ask IT (ticket / request / maintenance) plus Chat plus email, with only a short note on the raise-ticket form. Employees will pick wrong — and then land on an empty My devices or empty ticket list.
- Manager home is a billboard of counts without drill-down for devices/people. Pending approvals and Team tickets have hrefs; Team devices does not.
- Super Admin and IT Admin shells are almost identical (Users tab + a couple of dashboard links). Fine, but the brief promised “feel like different products”; only Employee/Manager/Support really do. Super Admin’s post-login **0 assets / Refreshing…** makes the most privileged role look broken for a second.
- Accessories card “Issue” vs Consumables “Issue” vs Asset “Assign” vs Request “Fulfill” vs Kit “Onboarding runbook” — too many verbs for the same physical act of handing someone a thing.
- Chat default `#it-ops` test pings vs empty `#helpdesk`/`#procurement`.
- Reports cards share one meta string factory; Manager still sees “estate-wide”; Reset is disabled.
- Login demo panel + prefilled password would be fine on localhost and is reckless on Render. “Estate at a glance” numbers are fake. Title `NewVisionITIS` looks like a typo for “IT IS”.
- Empty vs loading: Super Admin KPIs 0+Refreshing; Employee My devices blank card; Employee tickets chrome without rows; Manager requisitions “No requisitions yet” (true under current scope).
- Tablet is the floor; authenticated phone use is a non-goal and the UI will fight you. Public scan is the only phone-first page — and it cannot complete an audit.
- Employees grid opens on Playwright leftovers, not “Aarav from Pune.” First impression of the directory is test pollution.

### Accessibility

**State:** Deliberate contrast work (link `#0958D9`, muted `#475569`, no AntD green tags). Axe on a handful of IT Admin screens. Help has a skip link, ToC, headings. Presence dots use shape + color. Status tags are text+color.

**Shortcomings beyond axe:**

- **No skip link** on the authenticated app (only Help). WCAG 2.4.1 Bypass Blocks (A).
- WCAG **2.2** adds **2.4.11 Focus Not Obscured (AA)** and **2.4.13 Focus Appearance (AAA)**. Sticky 52px header + 216px sider can cover focused table cells when scrolling; this was not tested.
- Axe suite **does not run as Employee/Manager/Support**, or on login, scan, procurement, settings.
- `aria-hidden-focus` globally disabled in `a11y.spec.ts` — likely hiding real modal/dropdown focus traps from Ant Design.
- Ant Design 5 Table: filter triggers historically not keyboard-operable; virtual mode drops table semantics (antd #58131, 2026). DataGrid is the core UI.
- Chat composer is a custom rich-text surface; not in a dedicated SR test. Prior Prompt 26 claimed complete; this pass did not re-run a screen reader.
- Login `Input.Password` and demo account list are mouse-easy; autofill vs prefilled demo fights password managers (`autoComplete` is set, `initialValues` still overwrite).
- Focus order: sider (216px) before main on every admin page without skip.
- Sign-out confirm and command palette were improved in earlier prompts; Employee/Manager shells were never axe’d.

This is **not** WCAG 2.2 AA for the whole product. It is “we axe’d the happy path for one role.”

### Performance & scalability

**State:** Fine at 1,250 assets / 1,180 employees for a single Nest process. Prompt 17 split the JS bundle (Ant Design ~1.2 MB irreducible). Prompt 28 added indexes on `warranty_end`, `next_audit_due_at`, `notifications.type`. pg `Pool max: 10`. List endpoints paginate (`parseListQuery` caps `take` at 500). JWT `validate()` hits the database on **every request** (role loaded live — good for deactivation, extra query).

**Hotspots:**

- Employee history is merged in the application layer (accepted in ENHANCEMENTS P2) with high `take` caps — one profile can fan out many queries.
- Global search runs a large `Promise.all` of independent `findMany`s (assets, employees, locations, tickets, helpdesk, accessories, consumables, requests, vendors, PRs, POs) on every ⌘K keystroke (200ms debounce). Acceptable at this size; will get noisy, not catastrophic.
- Chat and ticket files in `bytea`; import jobs store the whole file. Hobby Postgres 1 GB.
- Socket.IO on the same Node process as cron + IMAP. Render Free sleep kills sockets; keep-alive GitHub Action pings `/api/health` every 10 minutes — a single missed workflow and overnight chat/cron die. Health does not prove Postgres is up.
- Import `setImmediate` is not a queue. Two concurrent commits can contend; no Redis (deferred on purpose).
- Frontend: Ant Design 1.2 MB on any authenticated route that pulls antd. Login still cheaper due to lazy routes.
- Seed + Playwright have already grown local estate to **1,261 assets / 1,189 employees** (sidebar badges). Production **1,253-class**. The “1,250” story is already a lie; tests accumulate rows (`PROGRESS.md` known issue).
- Notification list will grow unbounded with daily warranty broadcasts × 1,250 assets × 3 thresholds; every user reads the same rows.

### Security & data protection

**State:** JWT + refresh, bcrypt (cost 10), global guards, a lot of `@Roles()`, Prompt 28 closed several IDOR holes, webhook secrets redacted after create, public scan PII-conscious, chat upload allow-list, import 10 MB interceptor cap, forgot-password does not enumerate in the JSON response (always `{ success: true }`).

**A security review would still flag:**

| Item | Severity |
|------|----------|
| Demo passwords on production + login prefill + demo account list | **High** |
| No brute-force / rate limit / lockout on `POST /auth/login` (ASVS 2.2.1) | **High** |
| No Helmet, no CSP, JWT in localStorage (ASVS 8.2.2), Google Fonts CDN | **High** (XSS = session) |
| Broadcast notifications + global `isRead` (estate codes to Employee; Mark-all-read races IT) | **High** |
| Manager `GET /vendors/:id` unmasked bank | **High** |
| Swagger public | **Medium** |
| `GET /dashboard/setup` + locations + departments (with counts) + categories + issue-kits + location summary for Employee | **Medium** |
| Public sequential asset-code enumeration | **Medium** |
| Ticket upload octet-stream / missing html-svg block vs chat; unsanitized `Content-Disposition` | **Medium** |
| Login/forgot-password timing enumeration | **Medium** |
| `EMAIL_INGEST_SECRET` empty → webhook 403 (good); if someone sets a short secret, timing-unsafe `!==` compare | **Low** |
| JWT_SECRET fallback `'dev-only-secret-change-me'` in `jwt.strategy.ts` / `auth.service.ts` if env missing | **High** in misconfig |
| Password min 6 on reset/login; no breached-password check (ASVS 2.1.7) | **Medium** |
| Change-password leaves refresh valid; one refresh slot, no reuse detection | **Medium** |
| No MFA | **High** before real users |
| Super Admin can create other Super Admins (`user:manage`) with 8-char password | **Medium** |
| Permission rows in DB are decorative | **Low** (confusion) |
| Compose JWT 8h + `SEED_ON_START` wipe; Render Postgres `ipAllowList: []` | **Medium** (ops) |
| No login audit trail (CERT-In / ASVS 8.3.5) | **High** for an Indian internet host |

This is **not** production-ready on a public URL.

### Data integrity & reliability

**Strengths:** Asset lifecycle state machine, maintenance coupled to asset status in a transaction, procurement handoff never deletes (flags `needsReconciliation`), audit append-only for mutations, ticket numbers assigned after insert, import rollback of created IDs, warranty/digest de-dupe markers, serial `@unique` (Postgres allows multiple NULLs).

**Risks:**

- Seed `Math.random` brand/model pairing and Playwright create-asset / create-employee accumulation **corrupt the meaning of demo data**.
- `SEED_ON_START` without `SEED_IF_EMPTY` still wipes local Docker. Render sets both (safe). Compose does not.
- Super Admin `employeeId` null breaks ticket-as-self and muddies “your locations.”
- Demo user `employee@newvision.local` attached to Rahul Kulkarni — identity split.
- Mailer `send()` never throws: ticket is saved, email silently missing. Correct for availability; operators only see `mailFailing` if a *live* transport failed in the last hour. Console mode never sets `mailFailing`.
- Cron `@Cron(EVERY_DAY_AT_8AM)` is process-local, timezone = server TZ (Render Singapore). Sleeping Free instance skips the day. Warranty math is UTC date-only (`warranty.ts`); IST “today” can disagree near midnight.
- Webhook no retry; import no durable queue.
- `RolesGuard` returns true for `ws` context; chat gateway re-checks staff JWT itself (good). If someone adds a new namespace and forgets, it is open.
- Cascade: `ChatMessage` parent delete cascades replies; `User` delete is not the offboard path. Employee hard-delete blocked when history exists (good). Asset hard-delete Super Admin + retired/disposed only.
- Broadcast `isRead` is a cross-user write.
- Checklist `doneById` pre-filled.
- Offboard leaves open tickets and chat memberships.
- `Asset.vendor` string vs `vendorId` can diverge.

### Testing & maintainability

**State:** Substantial Jest unit + API e2e (Prompt 28 `audit-28-rbac.e2e-spec.ts` is the right kind of test) and Playwright including axe. CI exists.

**Gaps:**

- README/PROGRESS test counts are **stale and contradictory**. Do not quote them as truth without re-running.
- Playwright is **IT-Admin-centric**. Manager device dead-end, Employee My devices, Super Admin empty KPIs, broadcast notifications, issue-kits GET, department counts were not gated. Several specs **write shared saved views and leftover employees/assets into the demo DB**.
- `forceExit: true` on Jest e2e because cron keeps the process alive — hides leaked handles.
- Two permission matrices (backend `permissions.ts`, frontend `access.ts`) must be edited in lockstep; Prompt 25 already drifted once. Controllers that omit `@Roles()` bypass both.
- Module patterns differ: procurement has its own activity log *and* `audit_logs`; maintenance vendor is a string; tickets store files in `bytea` with a weaker allow-list than chat; notifications sometimes fan-out and sometimes broadcast.
- `PROJECT_STATUS.md` / `PROJECT_DOCUMENTATION.md` / Help / README are four sources of truth. That will slow every future prompt.
- Local `node dist/main.js` without rebuild silently serves pre-Prompt-28 RBAC — tests against that process will **false-fail or false-pass** relative to source.

### Deployment & operations

**State:** Render Blueprint, Docker API, static web, GitHub keep-alive, bootstrap seed mode, Resend path in code, HTTPS URLs documented, Singapore region.

**Not production-ready because:**

- **Hobby Free Postgres expires in 30 days** (`render.yaml` comments, README). No backup story in-repo. `ipAllowList: []`.
- **Free API sleeps**; keep-alive is a GitHub cron that can fail silently (repo disable, Actions minutes). URL is hard-coded to `https://newvision-api.onrender.com`.
- **Outbound email and IMAP unproven** on production. Local transport `console`.
- **No APM, no error tracker, no log drain** in the app. Health is `{ ok: true }` with no DB check.
- **Swagger open.** CORS locked to the web origin (good).
- **Demo Super Admin password** still valid on the live host (prior production probe).
- **No documented restore drill.** Seed bootstrap vs demo seed is easy to get wrong (`SEED_MODE=bootstrap` vs wiping 1,250 rows).
- **Monorepo path filters:** docs-only commits do not redeploy API — good — but a frontend-only deploy against an old API is how Prompt 28 UI and stale API diverge locally.
- **Region = Singapore.** CERT-In wants ICT logs retained **in Indian jurisdiction**. Singapore is not that. DPDP allows cross-border processing with notice; CERT-In logging is stricter for covered entities. Moving the DB to Mumbai/Hyderabad (or accepting “this is a demo, not a fiduciary system”) needs to be an explicit decision.
- **No NTP-to-NPL/NIC statement**, no 6-hour incident runbook, no 180-day log retention. Out of scope as a product module; **in** scope as an ops paragraph in README.
- **Google Fonts** at runtime: extra dependency if the office firewalls Google.

---

## E. Opportunities & enhancements (ranked)

Value order. Effort: S / M / L. Source: **code/app** | **comparable** | **standards**.

### Do first (high value, fits current scope)

| # | Enhancement | Why | Module | Effort | Source |
|---|-------------|-----|--------|--------|--------|
| 1 | **Treat production as a real tenant: rotate demo passwords, remove login prefill/demo box when `NODE_ENV=production`, close Swagger or wrap it in auth, set `RESEND_API_KEY` + `IMAP_*`.** | Live Employee login with `Password123!` worked in the prior production probe. Email is the helpdesk. Nothing else matters if the host is public and mail is off. | Admin / email | S–M (ops) + S (login flag) | **app** + **standards** |
| 2 | **Stop broadcasting notifications. Fan warranty + issue-reported out to IT user ids (same pattern as low-stock). Make `isRead` per-user (join table or per-user rows). “Mark all read” must never update another user’s row.** | Employee currently sees other offices’ asset codes; Mark-all-read clears IT’s bell. Highest remaining IDOR-class hole after Prompt 28. | Notifications | M | **code** |
| 3 | **Lock remaining RBAC leaks: setup, locations (+ summary), departments, categories, issue-kits, saved-view sharing, manager vendor get/list, unmask bank only for IT Admin, ticket upload allow-list = chat, sanitize `Content-Disposition`.** | Prompt 28’s lesson: UI hide ≠ API. Bank + estate counts + uploads + **kits + department headcount** are the leftovers. | RBAC / procurement / tickets / settings | S–M | **code** |
| 4 | **Phone scan: authenticated or tokenized “Audit now” + optional condition note + optional location confirm** (Snipe-IT audit-by-tag). | Closes the ITAM loop Snipe-IT users live in, without a phone admin app (still a non-goal). | Assets / scan | M | **comparable** (Snipe-IT `POST /hardware/audit`) + **app** |
| 5 | **Manager Team devices / Team people pages** (or allow `/assets` + `/employees` for Manager with existing API scope). | KPI without a list is a lie. | Employees / assets / dashboard | S | **app** |
| 6 | **Link Super Admin (and any `user:manage` account) to an employee, or let staff raise tickets without `employeeId`.** | Sara cannot be a requester. | Tickets / seed | S | **app** |
| 7 | **Fix the demo identity and seed pairing: one name per login, brand+model paired, complete some repairs, stop Playwright writing into the demo DB (or isolate).** | Esha≠Rahul, Lenovo Apple Air, 104 stuck repairs, Contract Followup at the top of Employees — reviewers will not trust anything else. | Seed / tests | S–M | **app** |
| 8 | **Inbound email attachments + HTML sanitize; prove one real mailbox.** | Email-in without screenshots is a toy. | Email-in | M | **app** + **comparable** (Zendesk/JSM) |
| 9 | **Fulfilment records the asset** (`fulfilledAssetId`) and one-click “Issue kit” from an approved request. | Requests die as a status. Kits already exist and are disconnected. | Requests / kits | M | **app** + **comparable** (Snipe-IT kits) |
| 10 | **Maintenance vendor → Vendor FK; seed/complete the repair queue; filter “open >14d” as the default IT Support view.** | 104 under_repair / 0 repaired is the product looking broken. | Maintenance | M | **app** |
| 11 | **Fix Help/README/PROJECT_STATUS drift** (bulk assign, test counts, Prompt 20+ inventory, `accessToken` vs `access_token`). Hide Reports Reset or make it work. Fix document title `NewVisionITIS`. Remove fake 98.2%. | Help is the runbook. The title looks unfinished. | Help / docs / chrome | S | **app** |
| 12 | **Login rate limit + lockout + raise password min to 12 everywhere + revoke refresh on change-password + dummy bcrypt on unknown users.** | OWASP ASVS 2.2.1 / 3.3.3 / timing. Cheap relative to MFA. | Auth | S–M | **standards** |
| 13 | **Write login / logout / failed-login / password-change into `audit_logs` (or a dedicated `auth_events` table). Keep 180 days. Decide hosting region (India vs “demo only”).** | CERT-In authentication logs; ASVS 8.3.5. Singapore + no logs is an explicit non-compliance if this is a real tenant. | Audit / ops | S–M | **standards** (CERT-In 28.04.2022, DPDP) |
| 14 | **Skip link on authenticated chrome + axe as all five roles + stop disabling `aria-hidden-focus` without a replacement.** | Current axe is a green badge on one shell. | A11y | M | **standards** (WCAG 2.4.1 / 2.2) |
| 15 | **Fix Employee My devices empty card and Employee ticket list empty chrome** (don’t `syncWithLocation` against leftover admin query params; show the same cards as Home). Add “This device is broken.” | Live walk: Home shows the laptop; My devices is blank; tickets chrome has no rows. | Employee / assets / tickets | S | **app** |
| 16 | **Lightweight license seats on `VendorContract`** (who has a seat, entitlement vs usage already on the model). | 1,180 people will have M365. Don’t build Flexera/Freshservice SLM. | Procurement / assets | M | **comparable** (Snipe-IT / GLPI Licenses) |

### Do next (clear value, still on-scope)

| # | Enhancement | Why | Module | Effort | Source |
|---|-------------|-----|--------|--------|--------|
| 17 | Serial capture wizard at GRN / handoff | Receiving without serials creates junk AST codes. | Procurement | M | **app** + **comparable** |
| 18 | Loaner due email + My devices “due back” | `expectedReturnAt` is invisible to the employee. | Assets / notify | S | **comparable** (Snipe-IT expected check-in) |
| 19 | Reconciliation calendar reminder | Manual CSV is the design; nobody will remember. | Settings | S | **app** |
| 20 | Hide Requests from IT Support or make it fulfill-capable | Dead nav. | Requests / RBAC | S | **app** |
| 21 | Weekly warranty/audit PDF emailed to IT Admin | Snipe-IT email alerts pattern. | Reports | S | **comparable** |
| 22 | Audit log server export | Compliance. | Audit | S | **app** |
| 23 | Helmet + CSP + self-host Inter/JetBrains Mono | XSS/download hygiene; drop Google Fonts runtime. | Security | S–M | **standards** |
| 24 | Health check that pings Postgres | `{ ok: true }` lies during DB outage. | Ops | S | **standards** |
| 25 | Manager reports card meta “team-scoped”; **scope `locationReport(actor)`** | Copy + real leak. | Reports | S | **app** |
| 26 | Hide Cost/invoice from IT Support (list + CSV) and from Employee asset show unless you explicitly want it | Finance-sensitive. | Assets / reports | S | **app** |
| 27 | Employee FAQ Help section | Deflect without a KB engine. | Help | S | **comparable** (deferred KB, this is smaller) |
| 28 | Offboard also reassigns/closes the leaver’s open tickets and removes chat membership | JML hole. | Employees | S | **app** |
| 29 | Dispose flow: recycler + wipe-certificate file + serial confirmation | E-Waste Rules 2022 / ITAD practice. | Assets | M | **standards** (India e-waste) + **comparable** (ITAD) |
| 30 | Optional hostname / MAC / IMEI fields | L1 “which box is this?” | Assets | S | **comparable** (Snipe-IT fields) |
| 31 | One photo on assign / return | Custody disputes. | Assets | M | **comparable** |
| 32 | Timing-safe ingest secret; dummy bcrypt on unknown login | Tiny, correct. | Auth / email-in | S | **standards** |
| 33 | Allow a second concurrent refresh token (desktop + phone) or show “signed out elsewhere” | One-hash-per-user kicks people. | Auth | S | **app** |
| 34 | Fix checklist `doneById` only when `done` | Data integrity. | Settings | S | **code** |
| 35 | Super Admin dashboard: skeleton, not zeros | 0+Refreshing looks like an empty company. | Dashboard | S | **app** |
| 36 | DPDP: Super Admin “export this employee” JSON + a Help article on retention | Legal questionnaire. | Employees / help | S | **standards** (DPDP 2023) |
| 37 | Clean `#it-ops` seed; put one real welcome message in `#helpdesk` | Chat looks abandoned. | Chat | S | **app** |
| 38 | GRN/PO receiving checklist (serials, condition, qty) | Ops discipline. | Procurement | S | **app** |
| 39 | Hide mailbox status card for IT Support | Blank card. | Settings | S | **app** |
| 40 | Cap public scan: omit `condition` and exact warranty-day counts (status + location is enough) | Photographable sticker. | Public scan | S | **app** |

### Later / only if pain is demonstrated

| # | Enhancement | Why | Module | Effort | Source |
|---|-------------|-----|--------|--------|--------|
| 41 | Manufacturer/model tables | After seed pairing still hurts filters. | Assets | M | **comparable** |
| 42 | Stronger ticket presence (who’s typing, warn on second reply, persist beyond one process) | Only when two agents share a busy queue. Zendesk collision is the pattern. | Tickets | M | **comparable** (Zendesk) |
| 43 | First-class software license objects | If contracts’ entitlementCount is too weak. | Assets | L | **comparable** |
| 44 | Object storage for attachments (not `bytea`) | When Postgres approaches 1 GB. | Chat / tickets | L | **code** (FUTURE_IDEAS queue adjacent) |
| 45 | Depreciation / NBV report | If Finance asks. | Reports | M | **comparable** |
| 46 | GST breakup fields | Only if Finance refuses to own tax. Precoro does this; NewVision should not become Tally. | Procurement | M | **research** (India P2P) — likely still out |
| 47 | MSME vendor flag + 45-day overdue | If Finance asks. | Procurement | S | **research** (India) |
| 48 | Lost/stolen FIR + wipe-requested fields | Process, not MDM. | Assets | S | **app** |
| 49 | Reservation of available stock | Two admins racing a kit. | Assets | M | **comparable** |
| 50 | Checkout acceptance PDF | Custody. | Assets | M | **comparable** |
| 51 | Components (RAM/SSD) | Repair shop. | Assets | L | **comparable** |
| 52 | Per-user notification preferences beyond digest | Noise. | Notify | M | **app** |

---

## F. Explicitly out of scope / already considered

These showed up in research or in the live walk as “tempting.” They conflict with established non-goals (`PROJECT_STATUS.md` §8, `FUTURE_IDEAS.md`, `DECISIONS.md`). Listed so they are not silently omitted.

| Idea | Why it showed up | Why it stays out |
|------|------------------|------------------|
| Dark mode | OS `prefers-color-scheme`; many admin tools offer it | Approved light-only mockup; forcing light is a decision, not a miss |
| Phone-width authenticated admin | Floor-walkers use phones | Tablet floor + public scan is the decision; **do** add audit-on-scan instead of a mobile admin rewrite |
| SSO / SAML / Entra | Snipe-IT SAML; “directory account” login copy | Live AD/HR sync and IAM JML were explicit non-goals; fix the copy rather than build SSO |
| Workflow / rules engine | Zendesk triggers; JSM automation | Single-step requests + PR approval matrix are the designed substitute |
| CMDB / dependency graphs | JSM Assets, ServiceNow | ~1,250 laptops, not a service map |
| Full ITSM (change/problem/release, multi-SLA) | JSM/Freshservice | Spiceworks-simple helpdesk was the cap |
| AI triage / KB suggestions | Zendesk/JSM 2026 marketing | `FUTURE_IDEAS.md`; no training data, no ops owner |
| Redis / Bull | Import jobs, webhooks, mail | In-process is enough until files or volume prove otherwise |
| E-sourcing, PunchOut, OCR invoices, GL, payment rails | Precoro Automation tier | Explicitly not a finance system; payment **status** only |
| Multi-mailbox, Slack/Teams ticket ingest, guest chat, calls | Omnichannel research | One mailbox + staff chat is the cap |
| Ticket merge/split, custom fields builder, CSAT re-send, editable email templates | Helpdesk suites | Duplicate-of + canned macros cover the real need |
| Live HR/AD sync, fuzzy reconcile | Enterprise ITAM | Manual CSV is the design |
| Pin/bookmark/forward in chat; Teams federation | Prompt 24 leftovers | Chat is already the most overbuilt module |
| Bulk manual-edit; rewriting audit/notes | Admin convenience | Import/reconciliation + manual correction with reason |
| Network auto-discovery / GLPI agent / Freshservice software scan | Lansweeper/GLPI/Freshservice SLM | Out of scope; CSV in; **do** allow manual hostname/IMEI and license *seats* |
| Full GST engine / IRN / e-way bill | Precoro India marketing | Accounting system; export CSV instead |
| Configurable SLA engine, business hours, real KB | Helpdesk suites | If ticket volume stays ~20, My work + canned macros are enough. If it grows to 50+/day, revisit those three *as a scoped prompt*, not as sneak-ins |

**Interesting but still out:** moving the whole product to a Mumbai region “because CERT-In” is an **ops decision**, not a feature. Building a GRC/incident-response product is out. Writing login events and a README paragraph is in.

---

## G. Top recommendations

1. **Harden the public deployment** — rotate demo secrets, stop shipping prefilled `Password123!`, lock Swagger, rate-limit login. *A public Render URL with printed admin passwords is the highest-severity issue in the product.*
2. **Fix notification targeting and per-user read state** — stop broadcasting warranty/issue rows; never let Employee “Mark all read” clear IT’s bell. *Prompt 28-class hole that Prompt 28 missed.*
3. **Finish Prompt 28-style API hygiene** — setup, locations, departments, categories, issue-kits, manager vendor+bank, ticket uploads, shared saved views. *UI-hidden is not a control.*
4. **Make email real** — Resend on Render, one mailbox for email-in, inbound attachments. *Helpdesk without mail is a form with extra steps.*
5. **Scan-to-audit on the phone card** — *the actual ITAM daily habit still missing.*
6. **Give Managers a team inventory UI** — *stop advertising 11 devices they cannot open.*
7. **Repair seed/demo honesty** — Esha≠Rahul, Lenovo-Apple models, 104 stuck repairs, Playwright leftovers, fake 98.2%, `NewVisionITIS` title. *Reviewers will not trust a product that cannot name its own employee.*
8. **Auth baseline + login audit trail** — password min 12, revoke refresh on change, dummy bcrypt, Helmet/CSP, CERT-In-style auth events. *Cheap, expected, currently absent.*
9. **Request fulfilment → asset id + kit; offboard → tickets** — *close the hardware and leaver loops that already have UI.*
10. **Make docs true** — Help bulk-assign, README counts, one status doc. *Wrong Help is a product defect.*

### If only three

**1. Production hardening (login/demo/Swagger/rate-limit + mail actually sending).** Without this, nothing else should be demoed to real staff on the live URL.

**2. Remaining permission and data-boundary leaks, including broadcast notifications and bank unmask.** Prompt 28 proved the class of bug; leftovers (and the notification model Prompt 28 never looked at) are still exploitable with a browser.

**3. Physical audit on `/scan` plus Manager team lists plus a seed that does not lie.** Those are what make the inventory *true* and the Manager role *usable* — the rest of the suite already has more surface than daily IT will use.

---

*End of report. No application code was changed. The only file written in this pass is this one.*


---

<a id="part-2"></a>

# Part 2 — UI upgrade and Teams-style chat replica

_Merged from `UI_AND_CHAT_UPGRADE.md`. Text below is the original report._

# NewVision — UI upgrade & Teams-style chat replica

**Investigation and planning only.** No application code was changed in this pass.

**Related report:** product gaps, security, and ITAM/helpdesk backlog live in [Part 1](#part-1). This file is the **visual / interaction upgrade brief**, with Team Chat as the main case because that is the surface that was supposed to look like Microsoft Teams and currently does not.

**Constraints that stay in force** (do not “fix” these by copying Microsoft’s whole product):

- NewVision **light** design system (`frontend/src/theme.ts`, `design-reference/DESIGN_TOKENS.md`). No app-wide dark mode.
- **Tablet floor**, not a phone-width admin rewrite.
- Chat stays **staff-only** (Super Admin / IT Admin / IT Support).
- **No** calls, meetings, screen share, guests, or Microsoft Teams federation — already recorded in [`FUTURE_IDEAS.md`](./FUTURE_IDEAS.md).

---

## 0. Short Hindi brief (kyun replica nahi bani)

Chat **feature-complete** hai (channels, DMs, threads, reactions, mentions, files, presence, Socket.IO). Prompt 26 ne yeh verify kiya. Problem **look-and-feel** ki hai, features ki nahi.

Teen asli wajah:

1. `/chat` **admin shell ke andar** baitha hai — 216px sidebar + 52px header. Teams ek **apna app chrome** hai. Help pages already is pattern se bahar nikalte hain (`App.tsx` comment: Help is deliberately not nested). Chat nahi.
2. CSS khud likhta hai: **“NewVision tokens, not purple.”** Active row `#1677ff` / `#dbeafe` hai, Teams Purple `#5B5FC7` nahi. Composer Ant Design textarea + icon row hai, Teams ka bordered compose well nahi.
3. Layout **Slack + old Teams Comfy ka mix** hai. Right pane threads Slack jaisi hain; left/right bubbles **classic Comfy** hain. 2025 ka default New Teams aksar **saari messages left** rakhta hai; right bubbles **Comfy density** pe wapas aati hain. Reviewer “Teams replica” expect karta hai aur usko **IT console ke andar blue WhatsApp** dikhta hai.

Is file ka upgrade plan: pehle **chat ko full-bleed workspace** banao (Help jaisa), phir **Fluent-style composer / rail / message chrome**, phir **Unread / Mentions filters** (Teams 2025 list). Purple globally mat chipkao. Functionality (pin, quote-reply, density toggle) **baad** mein, alag phase.

---

## A. Executive summary

Prompt 24’s intent was a **Microsoft Teams replica at `/chat`**. What shipped is a **working staff messenger** with a three-column grid and Comfy-style left/right bubbles, painted in NewVision blue, nested inside Refine’s `ThemedLayout`. Help copy still calls it “a full-page, Microsoft Teams-style workspace.” That is half true: it is full-*height* (`calc(100vh - 52px)`), not full-*app*. The 216px `AppSider` and 52px `Header` stay on screen. Help documentation already escaped that shell; chat did not.

**Functionally, chat is the most complete module in the product.** [`DECISIONS.md`](./DECISIONS.md) Prompt 26: channels, DMs/groups, threads, markdown-lite toolbar, real `@mention` ids, reactions, attachments, edit/delete + audit, record unfurl, presence (colour + shape), typing, Socket.IO. Do not rebuild the backend. The replica failed at **chrome, density, rail, composer, and demo content**.

**If only four visual jobs are done, the replica lands:**

1. **Chat-owned chrome** — hide `AppSider` (and optionally collapse the app header into a thin Teams-like top bar) while on `/chat`, the way Help already owns `/help/*`.
2. **Compose well** — one bordered card: textarea inside, Format / emoji / attach / Send *in the well*, not a hairline above an Ant Design `Input.TextArea`.
3. **2025 rail** — Unread / Mentions / All pills + Find in the rail, not a command-palette Modal. Channel rows use a `#` glyph tile, not a grey Ant Design Avatar.
4. **Seed hygiene** — `#it-ops` must not open on “Bubble ping / Prompt24 ping”. Empty `#helpdesk` / `#procurement` need a channel welcome, not Ant Design `Empty`.

Broader UI (dashboards, empty vs loading, Manager dead KPIs) is in section **H**. Those are not Teams problems; they are why the rest of the console also feels unfinished.

---

## B. What “Teams replica” means in 2025–2026 (research)

Microsoft’s own Chat product moved while NewVision copied **classic Comfy (own messages right, others left)**. A replica that only copies 2021 Teams will still look “wrong” next to a reviewer’s current Teams desktop app.

### B.1 Combined Chat + channels (the 2025 list)

Microsoft combined chats and channels into one list, with **Favorites**, recency-sorted **Chats**, and **Teams and channels**, plus filter pills and Quick views.

| Teams 2025 list behaviour | Source |
|---------------------------|--------|
| Combined vs Separate Chat / Teams views | [Explore the new chat and channels experience](https://support.microsoft.com/en-us/office/the-new-chat-and-channels-experience-in-microsoft-teams-c6f38016-d59c-4226-b0f3-caef4e60f91e) |
| Favorites (replaces Pinned), custom sections, Unread / @mentions triage | [Adoption: new Chat and channels](https://adoption.microsoft.com/en-us/microsoft-teams/new-chat-and-channels-experience/) |
| Filter pills: Unread, Chats, Channels; More: Meetings, Muted, text search. Filters persist. | [User guide PDF (Public Preview)](https://adoption.microsoft.com/files/microsoft-teams/chat-and-channels/Microsoft-Teams-new-chat-and-channels-experience_User-guide.pdf) |
| @mention Quick view; Followed threads | Same Support article |

**NewVision today:** two static headings (`Channels`, `Chats`), a text filter, a search **Modal**. No Favorites, no Unread pill, no Mentions view, no combined recency sort.

### B.2 Message density: Compact vs Comfy

This is the single biggest “why doesn’t it look like my Teams?” mismatch.

| Density | What Microsoft does | Source |
|---------|---------------------|--------|
| **Compact** (often the *new* Teams default people see) | All messages **left-aligned**, tighter spacing, own messages not right-bubbled | [Microsoft Q&A — alignment](https://learn.microsoft.com/en-us/answers/questions/4431496/alignment-of-chats-id-like-my-responses-on-the-rig); [r/MicrosoftTeams](https://www.reddit.com/r/MicrosoftTeams/comments/18cshl2/compact_view_only_has_left_aligned/) |
| **Comfy** | Wider spacing; **own messages right**, others left; own bubble tinted | [Change chat message spacing](https://support.microsoft.com/en-US/teams/chat/change-the-spacing-of-your-chat-messages-in-microsoft-teams); [Office 365 for IT Pros (2022 origin of the toggle)](https://office365itpros.com/2022/01/31/teams-chat-spacing-density/) |
| Setting path | Settings → Chats and channels → Message density (also reported under Appearance) | Support article above |

NewVision **hard-coded Comfy L/R** in the leftovers pass ([`DECISIONS.md`](./DECISIONS.md): “classic Teams Comfy… we flipped once and will not flip again”). That decision is defensible **if** the UI also *looks* like Comfy: metadata outside the bubble, hover timestamp, no Ant Design chrome, compose well. Right now it looks like **iMessage in an ITAM table**. Reviewers who live in 2025 Compact Teams will say it is WhatsApp; reviewers who remember classic Comfy will say the colours and shell are wrong.

**Upgrade recommendation:** keep Comfy as default (honour the leftovers decision), add a **Compact** toggle later (section G). Do not flip alignment again without a setting.

### B.3 Fluent ChatMessage v2 (how a Teams bubble is built)

Fluent UI Northstar’s Comfy v2 layout (the one Teams design used as a reference):

- Author + edited state **outside** the bubble.
- Timestamp **on hover and focus** (still in the accessibility tree).
- No avatar on *mine* messages (Teams usage in Fluent examples).
- Action menu on hover/focus of the message.

Sources: [fluentui PR #24533](https://github.com/microsoft/fluentui/pull/24533), [PR #23974](https://github.com/microsoft/fluentui/pull/23974), [PR #18681 (no avatar on mine)](https://github.com/microsoft/fluentui/pull/18681).

NewVision already omits the avatar on mine messages (good). It still puts **name + timestamp in a header above every ungrouped bubble**, and the action bar is a white Ant Design button strip, not a Fluent overflow toolbar.

### B.4 Compose box (the thing people screenshot)

Real Teams compose is a **card**, not a page footer:

1. Click the box → it grows.
2. **Format** (`A` pencil) expands a formatting toolbar *inside* the well.
3. Emoji / GIF / sticker sit **in the well, usually on the right**; attach is a `+` or paperclip in the same row as Send.
4. Layout has shifted: older desktop put icons **below** the box; newer “simplified” compose puts Format / emoji / `+` **inside on the right**. Users complain either way — the constant is **one outlined well**, not a toolbar stranded above a naked textarea.

Sources: [Microsoft Support — emoji, GIF, sticker](https://support.microsoft.com/en-us/teams/chat/send-an-emoji-gif-or-sticker-in-microsoft-teams); [Microsoft Q&A — compose bar layout](https://learn.microsoft.com/en-us/answers/questions/4423429/how-do-i-switch-view-layout-of-my-compose-message); [MC3 compose symbols](https://kb.mc3.edu/print.php?id=12656).

**Out of scope for NewVision:** Tenor GIFs, stickers, Loop components, Copilot. Keep emoji + attach + markdown Format.

### B.5 Channel threads (2025)

Teams channels historically used **post + inline replies**. 2025 adds a **Threads layout** closer to group chat: hover → Reply in thread → **right pane**, with Followed Threads in the left adaptive rail. Rollout notes: [MC1088172](https://mc.merill.net/message/MC1088172), [Threads layout PDF](https://adoption.microsoft.com/files/microsoft-teams/Threads-layout-in-Microsoft-Teams-channels.pdf).

NewVision already uses Slack-like **right-pane threads**. That is now *closer* to 2025 Teams than 2019 channel posts. The miss is visual (pane looks like an Ant Design drawer) and the missing **Followed threads / Unread** rail, not the pane itself.

### B.6 Slack vs Teams (why the mix reads as “neither”)

| Region | Slack (2024+ desktop) | Teams (2025) | NewVision `/chat` |
|--------|----------------------|--------------|-------------------|
| Far-left | Activity bar (Home, DMs, Activity…) | App bar (Chat, Teams, Calendar…) | **NewVision IT sider** (Assets, Tickets…) |
| Conversation list | Custom sections, recency | Favorites + filters + combined list | Static Channels / Chats |
| Main | Left-aligned feed | Compact left *or* Comfy L/R | Comfy L/R |
| Thread | Right overlay | Right pane (threads layout) | Right pane |
| Composer | `contenteditable` well | Outlined well + Format | Ant Design TextArea + toolbar above |
| Brand | Aubergine / Slack green | Teams Purple `#5B5FC7` / `#4B53BC` | `#1677FF` / `#0958D9` |

Sources: [Computerworld — Slack 2024 UI](https://www.computerworld.com/article/2503287/how-to-use-slacks-new-interface.html); [Slack sidebar help](https://slack.com/help/articles/212596808-Adjust-your-sidebar-preferences); Teams purple [color reference](https://colorcodeguide.com/official/microsoft-teams).

NewVision copied Teams’ **three columns** and Slack’s **thread pane**, then kept the **ITAM sider**. That last column is why it never reads as a replica.

### B.7 Colour and Fluent 2 (do not purple the whole admin app)

- Teams Purple `#5B5FC7`, Dark Purple `#4B53BC`. White-on-purple is ~5.4:1 (AA); purple-on-purple fails. [Color codes](https://colorcodeguide.com/official/microsoft-teams).
- Fluent 2: brand colour is for **CTAs and product identity**, not large surfaces. [Fluent colour](https://fluent2.microsoft.design/color), [tokens](https://fluent2.microsoft.design/color-tokens).
- Contrast: 4.5:1 text, 3:1 UI components. [Fluent accessibility](https://fluent2.microsoft.design/accessibility), [WebAIM checker](https://webaim.org/resources/contrastchecker/).

**Decision for NewVision:** keep `COLOR_ACCENT` `#1677FF` / `COLOR_LINK` `#0958D9` as the product brand (approved mockup). Optionally add a **chat-only** selected-row tint that is a *blue* analogue of Teams’ selected state (`inset 3px` bar + `#dbeafe` already exists). Do **not** restyle `AppSider` or buttons purple. A purple chat island inside a blue IT console would look like a third product.

---

## C. What NewVision actually ships (grounded in source)

### C.1 Shell (the replica-killer)

| Piece | File | Reality |
|-------|------|---------|
| Chat route inside `ThemedLayout` | `frontend/src/App.tsx` ~254 | `/chat` is a child of Header + `AppSider` |
| Help **escapes** the shell | `App.tsx` ~282–294 | Comment: “deliberately not nested in the main app shell” |
| Chat CSS tries to eat page padding | `index.css` `.nv-teams-chat` | `margin: -20px -20px -64px; height: calc(100vh - 52px)` — still under the 52px header **and** 216px sider |
| Sider width | `index.css` ~62–68 | `216px !important` |

Help is the existence proof that a full-bleed NewVision surface is allowed.

### C.2 Layout & tokens

Comment at `frontend/src/index.css` ~1798:

```text
Prompt 24: Teams-style chat (NewVision tokens, not purple)
```

| Token in chat CSS | Value | Teams analogue |
|-------------------|-------|----------------|
| Active conversation | `background: #dbeafe; box-shadow: inset 3px 0 0 #1677ff` | Purple selected + thicker accent |
| Rail / panel | `#f8fafc` | Fluent `colorNeutralBackground2` |
| Own bubble | `#f0f7ff` / `#d6e8ff` | Comfy tinted bubble (lavender in Teams, blue here) |
| Their bubble | white + `#e9edf2` | Neutral bubble |
| Mention you | inset `#1677ff` | Teams uses a mention bar / badge |
| Drop overlay | `#1677ff` / `#f0f7ff` | Brand dashed well |

### C.3 Rail

`ChatPage.tsx` rail head: title “Chat”, search opens a **Modal**, plus “New”. Filter is a small Ant Design `Input`. List is `role="listbox"` with ArrowUp/Down (good). Sections are hardcoded **Channels** then **Chats**. Channel avatar is Ant Design `Avatar` with `#`. No Unread / Mentions / All. No Favorites.

### C.4 Transcript

- 5-minute grouping (`GROUP_MS`).
- Day separators.
- Own messages `is-mine` (right), others `is-theirs` (left).
- Hover/focus action chip: react, Reply, Edit, Delete (`opacity: 0` until `.nv-teams-bubble:hover` / `:focus-within` — keyboard path exists, good).
- `replyCount` link under the bubble (Help is accurate here).
- Transcript is `<section aria-label="Message transcript">` — **not** `role="log"`.
- Empty state: Ant Design `Empty` “No messages yet. Say hello.”

### C.5 Composer

`Composer` in `ChatPage.tsx` ~988: `fieldset.nv-teams-composer` → optional pending chips → mention `<ul>` → **toolbar of Ant Design `Button type="text"`** → `Input.TextArea` rows=3 → primary Send.

CSS: `border: 0; border-top: 1px solid #e2e8f0` — a **page divider**, not a compose card. Compact thread composer **drops the toolbar** entirely (`compact` prop).

### C.6 Content that breaks the demo

Playwright (`frontend/e2e/chat.spec.ts`) posts **`Prompt24 ping`** and **`Bubble ping`**. Those strings survive in `#it-ops`. `#helpdesk` and `#procurement` often show **No messages yet**. A replica with test debris will never screenshot as Teams, no matter how good the CSS is.

### C.7 Tablet

`@media (max-width: 1023px)`: grid becomes one column; **rail `max-height: 220px`**. That is a stacked admin form, not Teams (Teams keeps a list | pane split on tablet, or a full-screen conversation with a back chevron). In scope: a **conversation-first** tablet mode (list **or** transcript, not a 220px squashed rail). Out of scope: phone layout.

---

## D. Gap table — chat UI vs Teams (ranked)

Effort: **S** half-day, **M** 1–3 days, **L** a week+. Backend: **none** / **app** / **api**.

| # | Gap | Why it fails the replica | Effort | Backend |
|---|-----|---------------------------|--------|---------|
| 1 | Chat nested in `ThemedLayout` | Two left rails. Teams never sits inside another product’s nav. Help already proves the escape hatch. | **M** | none |
| 2 | Composer is a footer + icon row, not a well | First screenshot people take is the bottom of the pane. | **S** | none |
| 3 | Search is a Modal | Teams Find is in the list header / filter row. | **S** | none (API exists) |
| 4 | No Unread / Mentions / All pills | 2025 Teams identity is triage filters. Unread counts already exist on rows. | **S** Unread/All; **M** Mentions if new query | Unread = none; Mentions = maybe `api` |
| 5 | Ant Design Avatar / Empty / Button throughout | Reads as “admin console with bubbles.” | **M** | none |
| 6 | Channel `#` treatment | Teams uses a rounded square + hash glyph, not a person Avatar. | **S** | none |
| 7 | Message chrome not Fluent v2 | Timestamp always visible on ungrouped; actions are labelled AntD buttons, not a compact hover bar (emoji, reply, `…`). | **M** | none |
| 8 | No “new messages” / jump to latest | Auto-scroll while reading older history is hostile; Teams/Slack show a pill. | **S** | none |
| 9 | Transcript not `role="log"` | W3C ARIA23 uses chat as the example for `role="log"`. | **S** | none |
| 10 | Tablet stacks rail to 220px | Unusable; not Teams. | **M** | none |
| 11 | Demo pings / empty channels | Content is the skin. | **S** | seed |
| 12 | No Favorites / custom sections | 2025 list; pin is in `FUTURE_IDEAS.md` — treat Favorites as the in-scope rename of pin **if** you choose to build it. | **M** | `api` |
| 13 | No Compact vs Comfy setting | Honour leftovers default; add toggle so 2025 Compact users stop saying “this is WhatsApp.” | **M** | prefs (`api` or localStorage) |
| 14 | Thread pane is a grey column | Needs its own header (parent preview + close), not just “Thread” + AntD. | **S** | none |
| 15 | Hover-only *feel* despite `focus-within` | Action bar still looks like a form toolbar. Compact icon bar + `aria-label`s. | **S** | none |

Items 12–13 are **functionality**, not required to “look like Teams” on day one. Items 1–4 + 6 + 11 are the replica.

---

## E. Target visual spec (chat-only island)

Stay on NewVision tokens. Pretend the chat route is a **product surface**, the way Help is a **docs surface**.

### E.1 Chrome (Phase 1 — must)

**Recommended (copy Help):**

- New route wrapper: `/chat` **outside** `ThemedLayout`, same `Authenticated` pattern as Help.
- Chat-owned top bar ~48–52px: NewVision mark, conversation title, presence cluster, Details, a **Back to console** link (Help already has this).
- Unread badge stays; header Chat button in the *main* app still routes here.

**Acceptable lighter option if a full escape is too much routing work:**

- On `pathname === '/chat'`, force `siderCollapsed` and hide the sider with CSS (`width: 0`), keep the 52px app header. Still two headers, but one left rail.

Prefer the Help pattern. Two headers still look like an embed.

### E.2 Grid

Desktop ≥1024:

```text
[ 280px rail ] [ minmax(0,1fr) transcript ] [ 320px thread/details when open ]
```

- Rail background `#F8FAFC` (`COLOR_CANVAS`), 1px `#D5DEE8` right border.
- Transcript `#FFFFFF`.
- Thread `#F8FAFC`.
- No extra page padding; height `100vh` minus *chat* header only.

Tablet 768–1023 (still in scope):

- **List mode** or **conversation mode**, never both stacked with a 220px rail.
- Back chevron on the conversation header returns to the list.
- Thread replaces the transcript (full width) instead of a third column.

### E.3 Rail (Phase 1 visual + Phase 2 filters)

```text
Chat                              [Find] [+]
[ All ] [ Unread ] [ Mentions ]     ← pills, Teams 2025
Find in list…                       ← always visible, not a Modal
── Favorites          (Phase 2)
── Channels
     # it-ops          preview · 14:02 · badge
── Chats
     Priya IT          preview · 13:40 · presence
```

**Row spec (Comfy list, from Microsoft Support: previews on by default in Comfy):**

- Height ~56px, 8px radius, 8px horizontal padding.
- 36–40px tile: people = initials + `PresenceDot`; channels = 36px rounded-square `#` in `#EEF4FB`.
- Name 13px / 600 when unread, 500 when read.
- Preview 12px `#475569`, one line ellipsis (already exists).
- Time 11px right-aligned; unread `Badge` under it.
- Active: `inset 3px 0 0 #0958D9` + `#F0F7FF` (use link blue for the bar so it matches the rest of NewVision, not `#1677ff` glow).

**Find:** keep `GET /chat/search`. Render hits **in the rail or a dropdown under Find**, jumping to `?c=&m=`. Delete the Modal that copies the command palette.

### E.4 Conversation header

Not an Ant Design `Space` of tiny avatars + a “Details” button.

- 48px row, bottom border `#E2E8F0`.
- Title: channel shows `# name` 16px semibold; DM shows name + presence subtitle (`Available` — colour **and** word, already true of `PresenceDot`).
- Right: overlapping avatar stack (already there) + icon buttons (search-in-conversation can wait; Details as a **info** icon, `aria-label="Conversation details"`).

### E.5 Messages (Fluent-inspired Comfy, NewVision colours)

Keep L/R alignment (leftovers decision).

Ungrouped **theirs**:

```text
[avatar]  Name                         14:02     ← name outside bubble; time muted
          ┌─────────────────────────┐
          │ message markdown        │
          └─────────────────────────┘
          👍 2     3 replies · 14:10
```

Ungrouped **mine**: no avatar; cluster right; bubble `#F0F7FF`; label can stay “You”.

Grouped (same author, <5 min): no name, gutter shows **time on hover/focus** (already sketched in CSS). Timestamp must remain in the DOM for SR (Fluent v2 rule) — use visually hidden until hover, not `display: none` if you can avoid it (`opacity` / `visibility` is safer than removing from a11y tree). Current CSS uses `display: none` on grouped time — **change that**.

**Action bar:** 28px floating chip, icons only: 😊  ↩  ⋯ (Edit/Delete inside ⋯). Already `focus-within`. Meet [WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html): dismissible, hoverable, persistent until blur.

**Mention-you:** keep inset bar; add a small “Mentioned you” text for non-colour.

### E.6 Composer (Phase 1 — highest visual ROI)

Replace the top-border footer with:

```text
  ┌──────────────────────────────────────────────┐
  │  Write a message…                            │
  │                                              │
  │  [B I S ` ·]     😊  📎              [Send]  │
  └──────────────────────────────────────────────┘
```

- Outer: `margin: 8px 16px 16px`, `border: 1px solid #C9D3DF`, `border-radius: 8px`, white fill, focus ring `#0958D9` 2px (Fluent-style).
- Textarea: borderless, `min-height: 44px`, grows to ~120px.
- Format row **inside** the well (Teams Format-expanded state). Default can show a compact row (emoji, attach, Send) and expand Format on an **A** button — that matches current Teams “simplified” compose ([Q&A](https://learn.microsoft.com/en-us/answers/questions/4423429/how-do-i-switch-view-layout-of-my-compose-message)).
- Mentions list docks **above** the well, not as a disconnected `<ul>`.
- Pending files as chips **inside** the well (already conceptually there).
- Thread composer uses the **same** well, smaller padding — do not strip the toolbar.

Do **not** introduce Tenor/GIF. A smiley that opens the existing `EMOJI_PICKER` is enough. Optional later: `:smile:` shortcut ([Support](https://support.microsoft.com/en-us/teams/chat/send-an-emoji-gif-or-sticker-in-microsoft-teams)).

Native `<textarea>` or a contenteditable are both fine; stay on textarea unless markdown preview is required. Ant Design `Input.TextArea` is what makes it look like Settings.

### E.7 Thread pane

- Header: “Thread” + parent one-line quote + close.
- Parent frozen at top (Teams / Slack).
- Same message styles as main (already shared `MessageRow`).
- Same compose well.

### E.8 Empty & loading

| State | Do not use | Use |
|-------|------------|-----|
| Empty channel | Ant Design `Empty` illustration | Channel name + topic + “This is the start of #helpdesk.” + primary “Write a message” focus on composer |
| Empty search | Simple Empty | “No messages match **q**.” |
| Rail loading | Skeleton paragraph | 6 conversation-row skeletons (already close) |
| Transcript loading | blank | 4 message skeletons, not a spinning page |

### E.9 Colour (chat island only)

Keep global theme. Chat-local mapping:

| Role | Token |
|------|--------|
| Selected / unread bar | `COLOR_LINK` `#0958D9` |
| Own bubble | `COLOR_ACCENT_BG` `#F0F7FF` |
| Mention chip | existing `#dbeafe` / `#1d4ed8` (check 4.5:1 — `#1d4ed8` on `#dbeafe` is OK) |
| Presence | already colour + shape (`PresenceDot`) — keep |

Optional later: a **chat density** CSS class on `.nv-teams-chat` (`is-comfy` / `is-compact`) rather than a second component tree.

---

## F. Accessibility upgrades (chat)

Grounded in W3C + MDN, not “add aria somewhere.”

| Issue now | Target | Source |
|-----------|--------|--------|
| Transcript is a `<section aria-label>` | `role="log"` + `aria-label="Message transcript"` + redundant `aria-live="polite"` + `aria-relevant="additions"` | [ARIA23](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA23), [MDN `log`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/log_role) |
| Grouped timestamp `display: none` | Keep in tree; visually hide until hover/focus | Fluent ChatMessage v2; WCAG 1.3.1 |
| Hover actions | Already `:focus-within`; make icons named; Escape closes popover | [accessibility.build chat guide](https://accessibility.build/guides/accessible-ai-chat) (WCAG 1.4.13, 2.1.1) |
| Auto-scroll on new message | If user is not at bottom, **do not steal scroll**; show “New messages” pill; keep focus in composer | Same guide |
| `role="listbox"` on conversations | Fine for a selectable list; each row should be `role="option"` + `aria-selected` (verify `ConvRow`) | ARIA listbox |
| Typing line | Already `aria-live="polite"` | keep |

Do not announce every message twice: `role="log"` is polite and atomic=false. Do **not** also put `aria-live` on each bubble.

---

## G. Later functionality (after the replica looks right)

Split so a future prompt does not rebuild chat “because Teams has it.”

### G.1 In-scope next (product-sized, not Microsoft-sized)

Build these **after** Phase 1 chrome/composer/rail. Each is a real Teams habit at NewVision’s staff count (a handful of IT people).

| Feature | Why | Notes | Effort |
|---------|-----|-------|--------|
| Unread / All filter pills | 2025 Teams triage | Client filter on existing `unread` | **S** |
| Mentions view | “Messages directed at me” | May reuse search `q=@me` or a small `GET /chat/mentions` | **S–M** |
| Jump to latest / new-message pill | Stop fighting the user | Frontend only | **S** |
| Comfy / Compact density | Stops the WhatsApp vs Slack argument | `localStorage` is enough; optional user pref API | **M** |
| Channel welcome / topic as first-run | Empty `#helpdesk` looks broken | Seed + empty component | **S** |
| `:emoji:` shortcut | Teams Support documents it | Composer only | **S** |
| Mark all as read on the rail | Teams list overflow menu | One API if memberships already support read | **S** |
| Conversation mute already exists | Do not rebuild; surface it in row `⋯` | Prefs already `PATCH .../prefs` | **S** |

### G.2 Explicitly deferred (`FUTURE_IDEAS.md`) — do not sneak in

- Pin / bookmark / forward / **quote-reply**.
- Audio/video calls, meetings, screen share.
- Guest / external chat.
- Federation with Microsoft Teams.

If pin is ever approved, implement it as **Favorites** (Microsoft’s 2025 name), not a fourth concept.

### G.3 Do not add (looks like Teams, wrong product)

| Temptation | Why not |
|------------|---------|
| Teams Purple on the whole app | Violates approved mockup; Fluent says don’t paint large surfaces in brand |
| Copilot / Loop / GIFs from the public web | Privacy + ToS; staff IT chat does not need Tenor |
| Meeting chats filter | No meetings |
| Dark mode | Project non-goal |
| Phone-width chat as a PWA | Tablet back-chevron is the floor |
| Rebuilding on `@fluentui/react-northstar` Chat | Huge dependency; replicate **layout**, not the library |
| Slack-style left-only feed as the *only* mode | Contradicts leftovers Comfy decision unless Compact is a setting |

---

## H. Broader NewVision UI (not chat, still “sahi karo”)

Chat is the replica miss. The rest of the console fails for **honesty and empty/loading**, which is documented with evidence in [Part 1](#part-1). UI-only slice:

| Surface | What’s wrong | Upgrade |
|---------|--------------|---------|
| Super Admin home | KPI flash **0 + “Refreshing…”** | Skeleton tiles until first 200; never show 0 as a loaded fact |
| Employee My devices | Empty card while Home showed `AST-BHO-LAP-0064` | Fix query-param race on `AssetList`; empty state only when count is truly 0 |
| Employee `/tickets` | Filter chrome, no rows, while Home showed open tickets | Same class of bug; don’t render table chrome on error/empty-load |
| Manager home | “11 devices” **no href**; `/assets` blocked | Either link to a **team-scoped** list or remove the KPI. Help vs UI must match |
| Ant Design `Empty` everywhere | Same simple image on chat, tickets, requisitions | One NewVision empty illustration + one sentence + one primary action |
| Help vs live | Help still said no bulk assign while the button exists | Doc/UI single source — already a gaps item |
| DataGrid vs antd Table | antd Table keyboard/virtual semantics are weak | Keep DataGrid as the list primitive; don’t add new antd Tables |
| Global density | `controlHeight: 30`, font 13 — already compact | Don’t mix `size="large"` AntD on chat with `size="small"` on assets |

These are **S–M** frontend bugs. They make reviewers distrust every other screen, including a perfect Teams clone.

---

## I. Phased plan (do in this order)

### Phase 0 — Content (S, seed + one empty component)

Without this, screenshots still fail.

1. Stop leaving Playwright pings in `#it-ops` (test cleanup or dedicated test channel).
2. Seed one realistic starter message per `#it-ops`, `#helpdesk`, `#procurement` (topic + “how we use this room”).
3. Replace Ant Design `Empty` in the transcript with a channel-start card.

### Phase 1 — Replica look (M, frontend only)

Goal: a reviewer who uses Teams daily says “this is the IT chat” rather than “this is a table with bubbles.”

1. Escape `ThemedLayout` (Help pattern) **or** collapse sider on `/chat`.
2. Compose well (section E.6).
3. Channel `#` tile; conversation header; thread header.
4. Find in rail; remove search Modal.
5. `role="log"`; new-messages pill; grouped timestamps stay in the a11y tree.
6. Compact hover action bar (icons).
7. Tablet: list **or** conversation, delete `max-height: 220px` stack.
8. Recapture `frontend/public/docs/screenshots/chat.png` and update Help callouts if the chrome moved.

**Success check:** side-by-side screenshot vs Teams Comfy (web) — same regions: list, header, bubbles, compose card. Colours stay NewVision blue. No Assets/Tickets sider visible.

### Phase 2 — 2025 list habits (S–M)

1. All / Unread pills (client).
2. Mentions Quick view (API if needed).
3. Mark all read.
4. Mute in row `⋯` (API exists).

### Phase 3 — Density + optional Favorites (M, only if requested)

1. Compact (all left, tighter) vs Comfy (current L/R). Persist.
2. Favorites = approved version of `FUTURE_IDEAS.md` pin — **do not build until explicitly decided**.

### Phase 4 — Quote-reply / forward / bookmark

Still **out** until `FUTURE_IDEAS.md` is amended. Quote-reply is the one users will ask for next; it is a product decision, not a CSS task.

---

## J. Implementation notes (for the prompt that actually codes)

**Touch these files, not a rewrite:**

- `frontend/src/App.tsx` — route `/chat` like Help if escaping the shell.
- `frontend/src/pages/chat/ChatPage.tsx` — rail, header, composer, message actions.
- `frontend/src/pages/chat/ChatBody.tsx` — only if markdown/mention chips need density tweaks.
- `frontend/src/index.css` — `.nv-teams-*` block ~1798–2394.
- `frontend/src/components/StaffChat.tsx` — launcher still valid.
- `frontend/e2e/chat.spec.ts` + `frontend/e2e/help.spec.ts` — selectors for composer/search.
- `frontend/src/help/articles.ts` (`staff-chat`) — layout section will change if chrome moves.
- Seed / Playwright cleanup — `#it-ops` content.

**Do not:**

- Add `@fluentui/react` / Northstar.
- Change Socket.IO, mention storage, or upload allow-lists.
- Flip L/R alignment globally.
- Restyle the global Ant Design theme to purple.
- Build calls, GIFs, or pin “while we are in the CSS.”

**Verify in a real browser** (project rule): two staff sessions, send + thread + mention + unread pill + tablet width 1024 and 900. A static screenshot of `/chat` is not verification.

---

## K. Sources

### Microsoft Teams product

- [The new chat and channels experience (Support)](https://support.microsoft.com/en-us/office/the-new-chat-and-channels-experience-in-microsoft-teams-c6f38016-d59c-4226-b0f3-caef4e60f91e)
- [Adoption hub](https://adoption.microsoft.com/en-us/microsoft-teams/new-chat-and-channels-experience/)
- [User guide PDF](https://adoption.microsoft.com/files/microsoft-teams/chat-and-channels/Microsoft-Teams-new-chat-and-channels-experience_User-guide.pdf)
- [Change chat density](https://support.microsoft.com/en-US/teams/chat/change-the-spacing-of-your-chat-messages-in-microsoft-teams)
- [Send emoji / GIF / sticker](https://support.microsoft.com/en-us/teams/chat/send-an-emoji-gif-or-sticker-in-microsoft-teams)
- [Q&A: restore right-aligned (Comfy)](https://learn.microsoft.com/en-us/answers/questions/4431496/alignment-of-chats-id-like-my-responses-on-the-rig)
- [Q&A: compose bar layout](https://learn.microsoft.com/en-us/answers/questions/4423429/how-do-i-switch-view-layout-of-my-compose-message)
- [MC1088172 threaded channel layout](https://mc.merill.net/message/MC1088172)
- [Threads layout PDF](https://adoption.microsoft.com/files/microsoft-teams/Threads-layout-in-Microsoft-Teams-channels.pdf)
- [Office365itpros — Comfy vs Compact origin](https://office365itpros.com/2022/01/31/teams-chat-spacing-density/)

### Fluent / colour / a11y

- [Fluent 2 colour](https://fluent2.microsoft.design/color)
- [Fluent 2 tokens](https://fluent2.microsoft.design/color-tokens)
- [Fluent 2 accessibility](https://fluent2.microsoft.design/accessibility)
- [fluentui ChatMessage v2 Comfy](https://github.com/microsoft/fluentui/pull/24533)
- [Teams purple hex](https://colorcodeguide.com/official/microsoft-teams)
- [W3C ARIA23 `role=log`](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA23)
- [MDN `log` role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/log_role)
- [Accessible chat UI (accessibility.build)](https://accessibility.build/guides/accessible-ai-chat)
- [WebAIM contrast](https://webaim.org/resources/contrastchecker/)

### Slack (contrast, not a target)

- [Computerworld — Slack 2024 interface](https://www.computerworld.com/article/2503287/how-to-use-slacks-new-interface.html)
- [Slack sidebar](https://slack.com/help/articles/212596808-Adjust-your-sidebar-preferences)

### In-repo

- [`DECISIONS.md`](./DECISIONS.md) — Prompt 24, leftovers Comfy flip, Prompt 26 verification
- [`FUTURE_IDEAS.md`](./FUTURE_IDEAS.md) — pin/quote-reply deferred; calls/federation out
- [Part 1](#part-1) — non-chat product gaps
- `frontend/src/index.css` `.nv-teams-*`
- `frontend/src/pages/chat/ChatPage.tsx`
- `frontend/src/theme.ts`
- `frontend/src/help/articles.ts` — `staff-chat`

---

## L. One-line recommendation

**Do not rebuild chat.** Escape the admin shell, put the composer in a Teams-style well, give the rail 2025 filter pills and in-list Find, clean the seed, then stop. Density toggle and Favorites are the first *features* worth adding after it actually looks like the product you already claimed in Help.


---

<a id="part-3"></a>

# Part 3 — Daily IT Admin / ITIS practice

_Merged from `ITIS_DAILY_PRACTICE.md`. Text below is the original report._

# NewVision — Daily IT Admin / ITIS practice vs what we have

**Investigation and planning only.** No application code was changed in this pass.

**What this file is.** A map of **what an internal IT Admin / IT Support / ITIS team actually does every working day**, researched from ITIL 4, ITAM (ISO/IEC 19770), Indian corporate IT job practice (AMC, OEM claims, joiner laptop), and published helpdesk volume stats — then scored against **current NewVision source** (~1,250 assets, three offices, five roles).

**What this file is not.**

- Not [Part 1](#part-1) (security, RBAC leaks, email-not-live, seed lies).
- Not [Part 2](#part-2) (Teams look-and-feel).
- Not a rewrite of [`RESEARCH_ADMIN_EFFICIENCY.md`](./RESEARCH_ADMIN_EFFICIENCY.md) (11 Sep 2026). That file is **stale**: Assign-to-me, canned macros (`statusOnSend`), issue kits, bulk assign, My work, ticket presence, `lastAuditedAt` / `expectedReturnAt`, and maintenance↔ticket FK have since shipped. Do not re-build those.

**Product size this is written for.** Internal IT for ~1,180 people / ~1,250 assets / Pune–Hyderabad–Bhopal. Not a NOC, not an MSP with 50+ tickets/hour, not ServiceNow.

---

## 0. Short Hindi brief

IT Admin / ITIS ka **roz ka kaam** yeh nahi hai ki dashboard pe “1,261 assets” dekhe. Roz ka kaam hai:

1. **Queue** — naya ticket, overdue, “password nahi chal raha”, printer, Outlook, VPN.
2. **Joiner / leaver / mover** — laptop nikalna, wapas lena, office change.
3. **Toota hua samaan** — OEM warranty / AMC pe claim, spare dena, follow-up.
4. **Sachchai** — floor pe scan, stock, warranty/AMC khatam, toner khatam.
5. **Handoff** — shaam ko Sunil ko batao kya open hai.

NewVision mein **inventory + tickets + procurement + chat** already bahut hai. Jo **roz use** ke liye abhi kam hai: **corporate password/MFA playbook**, **OEM/RMA case number**, **phone se audit stamp**, **hostname/IMEI**, **employee move ke saath laptop**, **offboard pe tickets band**, **license seats**, **employee ko VPN/printer how-to** (abhi Help product-docs hai, L1 KB nahi), aur **warranty khatam → AMC shuru** wala queue.

Server monitoring, AD/Intune agent, calls, AI bot — **mat banao**. Woh ITIS ka alag stack hai.

---

## A. What “daily ITIS” means (research)

“ITIS” here = **internal IT Information Systems / IT Admin Support** for a company, not a telecom ITIS. Indian job posts for this role list the same bundle: end-user hardware/software, email/login, laptop **dispatch and recovery**, inventory/audit, **vendor / AMC / OEM**, printers. Example: [Shine — IT Admin Support (Noida)](https://www.shine.com/jobs/it-admin-support/weekday-ai/19084832) (laptop dispatch, AMC, credentials, asset audit). LinkedIn-style IT Admin CVs in India add Active Directory password reset, Outlook, imaging, Pulse Secure/VPN, ServiceNow tickets, store/printer inventory.

That is the job NewVision is for. A full **Daily IT Operations Checklist** (servers, backups, UPS, rack environment) is a **different job** (sysadmin / NOC). Source: [eAuditor daily IT operations checklist](https://eauditor.app/2026/08/10/daily-it-operations-checklist-2/). NewVision should **not** grow into that.

### A.1 How the day is actually spent

| Block | What the industry measures | Implication for NewVision |
|-------|----------------------------|---------------------------|
| L1 tickets | Password/account is the modal ticket. Gartner commonly cited **20–50% of helpdesk calls** are password resets ([TechTarget / Forrester cost + Gartner share](https://www.techtarget.com/enterprise-software/tip/Resetting-passwords-in-the-enterprise-without-the-help-desk)). Older Gartner note T-15-6454: **10–30%** of calls, **$51–$147** labour each ([passwordresearch.com summary](https://www.passwordresearch.com/stats/study76.html)). HDI 2011: **~3 in 10** tickets are password-reset related ([HDI Research Corner](https://www.thinkhdi.com/library/supportworld/2011/password-reset-practices)). | If NewVision only tracks *laptops* well and treats Access & Account as a generic ticket, it misses the **highest-volume daily motion**. |
| Next L1 pile | Printers, connectivity/VPN, slow PC, software install, email/collaboration ([InvGate common tickets](https://blog.invgate.com/common-help-desk-tickets), [ITSM.tools](https://itsm.tools/common-it-help-desk-issues-and-fixes/)). | Categories exist (`software`, `network`, `access_account`, `hardware_other`, `general`) but there is **no printer category**, no VPN/MFA template with a verify script, no “link this toner SKU.” |
| Deflection / FCR | Freshservice 2023: **>70%** of orgs have a knowledge base; those orgs save **~1.2 agent-hours/ticket**. 2024: KB saves **~2.19 hours**; **11–50 articles** improved ART **12%**; gen-AI self-service deflection is a *different* product. HDI: mature KCS ≈ **+12 points FCR**; remote control ≈ **+10 points FCR**. | Staff Help is **product documentation**. Employees need **10–30 how-to articles** (VPN, printer, MFA, Outlook search), not a bot. Remote control is out of scope. |
| ITAM daily | Teqtivity: receipt-into-register the day the box arrives; **daily new-hire and termination asset reviews**; data audits; licence watch ([ITAM daily checklist](https://teqtivity.com/itam-checklist-daily-practices-for-success/)). AMPthilly 2026: at **500+ people**, inventory is **continuous rolling audit**, not an annual event ([inventory checklist](https://ampthilly.com/blog/it-asset-inventory-checklist/)). | 1,180 employees → rolling scan-to-audit is a **Need**. Annual Excel is not a practice. |
| JML | Joiner / Mover / Leaver is the ITAM operating model ([Licenseware JML](https://licenseware.io/joiners-movers-leavers-itam-process/), [xAssets joiners-leavers](https://www.xassets.com/docs/itam-guide/asset-management/joiners-and-leavers), [ITDEVTECH 5-day lead time](https://itdevtech.com/blog/it-onboarding-offboarding-service-desk-process-guide)). Indian MSME write-up: Day-1 laptop missing + AD typo is the Monday tax ([Hives 10-item checklist](https://hives.cloud/blog/it-admin-checklist-new-hire-onboarding)). | Joiner kit + offboard API exist. **Mover is thin.** Leaver does not close tickets. |
| India hardware | Warranty claim needs **invoice + serial + OEM case ID**; liquid/physical damage is often **out of warranty** and goes ADP/chargeable ([Laptop Repair World — India claim process](https://www.laptoprepairworld.com/blog/laptop-warranty-claim-process-india/)). After OEM warranty, **AMC** with zero-day gap ([manufacturing AMC coordination](https://www.manufacturingplantindia.com/warranty-and-amc-coordination-consulting-services-for-manufacturing-plant-machinery-projects/)). Reddit r/developersIndia: employees are told “give it to IT, it’s under AMC/ADP — do not use a local shop.” | Maintenance has a vendor **string** and cost. It does **not** store OEM SR / RMA, coverage type (OEM / AMC / ADP / chargeable), or pickup vs carry-in. |
| Coverage vs MDM | Intune ≠ ITAM. Intune sees enrolled endpoints; ITAM owns monitors, printers, warranty, custody, dispose ([InvGate — Intune vs ITAM](https://blog.invgate.com/intune-asset-management)). | Do not build an Intune clone. **Do** add hostname / last-seen-*optional* as CSV fields so L1 can answer “which laptop is on the network?” |
| Shift end | Structured handoff: open incidents, next action, named owner, ack ([incident.io handoff](https://incident.io/blog/async-on-call-handoff-template), [Shiftctl 2026](https://shiftctl.com/blog/on-call-handover-guide)). | `#it-ops` can hold this **if** there is a template. There is no “handoff” object — and that is OK if chat + My work are honest. |
| Standard | ISO/IEC 19770-1: ITAM system + process areas including **change, data, licence, security, lifecycle** ([ISO page](https://www.iso.org/standard/68531.html), [ISO committee summary](https://committee.iso.org/sites/jtc1sc7/home/projects/flagship-standards/isoiec-19770-12017.html)). ITIL 4 service desk: incident vs **service request**, categorization, FCR ([PDCA ITIL 4 desk](https://pdcaconsulting.com/itil-service-desk-processes-roles-best-practices/)). | One ticket object is fine at this volume. Missing: **request catalog items** (password, access, standard laptop) and **licence seats**. |

### A.2 Practices that are *not* NewVision’s daily job

Leave these in the other team’s tools:

- Server / backup / UPS / SAN health (sysadmin checklist).
- Patch Tuesday / SCCM / Intune compliance (MDM).
- Live AD/Entra sync, SSO, Conditional Access (`FUTURE_IDEAS.md`).
- Network monitoring, firewall change, CAB (ITIL change enablement at enterprise scale).
- AI triage / virtual agent (Freshservice 46–53% deflection is a different product class).

---

## B. Have / partial / missing — scored for *daily use*

Legend: **Have** = usable today in source · **Partial** = object exists but the daily loop is broken or invisible · **Missing** = the practice has no first-class support.

### B.1 Morning queue (IT Support + IT Admin)

| Daily practice | NewVision today | Score | What to add |
|----------------|-----------------|-------|-------------|
| Open overnight + overdue + unassigned | Support **Queue** home + **My work** (overdue, unassigned, waiting 3+ days). Assign-to-me + `I` shortcut. | **Have** | Default the ticket list to **My work / Unassigned** after login (last-view persist already partly there). |
| First-response SLA clock | `TicketPriorityTarget` minutes; overdue is visual; clock pauses on `waiting_on_employee`. | **Partial** | Email-when-*my*-ticket-goes-overdue (`FUTURE_IDEAS.md` keeps a full escalation engine out). |
| Password / lockout / MFA | Category `access_account`. Seed ticket: “locked out… password reset.” App **forgot-password** only resets **NewVision login**, not M365/AD. No identity-verify script on the ticket. | **Missing** (the real reset) / **Have** (app login) | See §C.1. |
| Printer / toner | Consumables + low-stock attention. No printer **category**. Toner not linked to a printer asset. | **Partial** | Category + optional `consumableId` on ticket or a “Printer jam / toner” template. |
| VPN / MFA / Outlook | Checklists are **labels** (VPN/MFA). Tickets are free text. | **Partial** | Templates with `{{asset}}` + 8-line verify script (not an IdP). |
| Collision (two agents, one ticket) | `POST .../presence` + “X is viewing.” | **Have** | Keep. |
| Macros | Canned + `statusOnSend` waiting/resolved. | **Have** | One more macro: “Password reset completed — verify & close.” |
| Email-in / copy-to-Outlook | Code exists; local transport often `console`. | **Partial** | Live mail is a **ops** Need (`PRODUCT_GAPS`). |
| Knowledge for the employee | `/help` is **how to use NewVision**. No “connect to Pune Wi-Fi / reset MFA” library. | **Missing** | §C.2 (10–30 articles). `FUTURE_IDEAS.md` defers a *configurable KB engine* — a **static** employee FAQ is not that engine. |
| Problem / major incident | Duplicate-of link only. No problem record, no banner, no “50 people, Outlook down.” | **Missing** | §C.8 (thin). |

### B.2 Joiners, movers, leavers (the ITAM day)

| Daily practice | NewVision today | Score | What to add |
|----------------|-----------------|-------|-------------|
| Know who starts this week | Employee `dateJoined`; no “starting in 5 days” attention row. | **Partial** | Attention: `dateJoined` in next 7 days **and** no assigned laptop. Matches [ITDEVTECH 5-day lead](https://itdevtech.com/blog/it-onboarding-offboarding-service-desk-process-guide). |
| Issue standard kit | `IssueKit` + Settings panel + assign accessories. Help still **wrongly** says no bulk assign in one article; assets list **has** Bulk assign. | **Have** (kit + bulk) | Fix Help. One-click **Issue kit** on the employee profile if it is buried in Settings. |
| Image / Autopilot / Intune enroll | Checklist item text only. | **Out** | Stay a checkbox. Do not build imaging. |
| Custody signature / PDF | Assign is IT-only click. | **Nice** | One-page “I received AST-…” later. |
| **Mover** (office/dept/role) | Asset **transfer** exists. Employee `locationId` / `departmentId` are edited separately. Licences N/A. | **Partial** | §C.3 one “Move employee” action: new location + move assigned assets + note. |
| Leaver — hardware back | `POST /employees/:id/offboard` returns assets, accessories, deactivates login. | **Have** | |
| Leaver — tickets / chat / licences | Open tickets stay. Chat memberships stay. No seats to reclaim. | **Missing** | Close or reassign open tickets; remove chat membership (`PRODUCT_GAPS` already flagged). |
| Contractor end date | `contractEndDate` + filters. My work includes contracts ending 14 days. | **Have** | Keep. |
| Loaner due | `expectedReturnAt` on assignment; overdue on My work; **no email**; Employee My devices may not show due-back. | **Partial** | Show due-back on My devices; mail when transport is live. Do not auto-check-in. |

### B.3 Break-fix, warranty, AMC (India daily)

| Daily practice | NewVision today | Score | What to add |
|----------------|-----------------|-------|-------------|
| Log a hardware fault against an asset | Maintenance + optional `supportTicketId`. Status `under_repair`. | **Have** | Live queue was **104 under_repair / 0 repaired** — completion loop is the practice hole (`PRODUCT_GAPS`). |
| Spare / hot-swap | `available` stock + assign. No “loaner while in repair” flag beyond expected return. | **Partial** | On “send to OEM”: prompt **issue loaner** (expectedReturnAt = repair ETA). |
| OEM case / RMA | `vendor` is a **string**. No `oemCaseId`, no RMA, no coverage enum. Invoice lives on **Asset** (`invoiceNo`) but is not prompted at claim time. | **Missing** | §C.4. |
| Warranty vs AMC vs ADP vs chargeable | `warrantyEnd` on asset. `VendorContractType` includes `warranty` and `amc`. Not a **per-incident coverage decision**. | **Partial** | Coverage picker on the maintenance row + “expiring 60 days → open AMC quote” from contract module. |
| Preventive AMC visit | Contracts have dates/SLA text. No PM visit calendar. | **Nice** | Quarterly “AMC visit due” attention from contract `endDate` / a `nextPmAt`. |
| Employee damaged laptop | No ADP/insurance claim fields. Indian practice: declaration of how it happened, then OEM/AMC — never local shop ([r/developersIndia thread](https://www.reddit.com/r/developersIndia/comments/1k2yp3p/company_laptop_got_damaged_while_travelling_in/)). | **Missing** | Three strings: `incidentKind` (defect / accidental / liquid / lost), `employeeDeclaration`, `chargeable`. |

### B.4 Inventory honesty (rolling audit)

| Daily practice | NewVision today | Score | What to add |
|----------------|-----------------|-------|-------------|
| Who has what | Employee profile + asset show + ⌘K. | **Have** | Manager still cannot open team `/assets` (`PRODUCT_GAPS`). |
| Receive stock the day the courier arrives | GRN → asset handoff. | **Have** | Keep. |
| Floor audit / cycle count | `lastAuditedAt` / `nextAuditDueAt` + **Audit now on asset show**. Public `/scan/:code` is **read-only**. | **Partial** | Authenticated or tokenized **Audit now on the sticker page** — the actual daily habit at 1,250 assets ([Snipe-IT audit-by-tag](https://snipe-it.readme.io/reference/hardwareauditdue), Teqtivity/AMPthilly cadence). |
| Identity fields for L1 | No hostname, MAC, IMEI, phone number, OS. | **Missing** | Optional strings + CSV. No agent. |
| HR vs IT register | Settings CSV reconciliation. No calendar nudge. | **Partial** | Monthly nudge on attention. Fuzzy match stays deferred. |
| Software / SaaS seats | `license_subscription` contract + `entitlementCount` / `usageCount` numbers. No “who holds the Adobe seat.” | **Missing** | Seat table on the existing contract (`PRODUCT_GAPS`). ISO 19770 **licence management** is this, not a SAM suite. |

### B.5 Procurement & supplies (not every day, but blocking when it is)

| Practice | Score | Daily note |
|----------|-------|------------|
| Toner / mouse / HDMI low | **Have** (threshold + attention) | Daily for Support if Bhopal flash drives are at 8/10 threshold (seed). |
| Raise PR / PO / GRN | **Have** | Not every morning; **Need** when a joiner has no spare laptop. |
| Vendor scorecard | **Have** | Weekly/monthly, not daily. |

### B.6 Handoff and “what did we even do”

| Practice | Score | Daily note |
|----------|-------|------------|
| Staff chat | **Have** (overbuilt vs UI) | Use `#it-ops` for verbal handoff. |
| Structured shift note | **Missing** | A **Help article + canned chat template** is enough before a new module. |
| Time spent on ticket | **Have** (`TicketTimeLog`) | Use it; don’t add another timer. |
| CSAT | **Have** | Monthly metric, not a daily queue. |

---

## C. Functionality to add (ranked)

Only items that a **daily ITIS team would miss this week**. Effort **S/M/L**. Do not sneak in `FUTURE_IDEAS.md`.

### C.1 Password / account / MFA playbook — **Need — S**

**Why it is #1.** Industry volume (Gartner/HDI) plus NewVision already seeds lockout tickets. IT Admin Support JDs list “credential & access management” as a bullet equal to laptops.

**Do not** connect Active Directory.

**Do:**

1. Ticket template **“Account lockout / password / MFA”** (`access_account`, high): body checklist — verify employee code + manager or ID, which system (NewVision / M365 / VPN / biometric), last successful login if known, do not reset until verified.
2. Canned macro **“Reset completed”** → public reply + `resolved`.
3. On employee profile (IT only): **Send NewVision reset link** is already there for Users. Surface a button **from the ticket** when requester has a User. For M365/VPN, the ticket *is* the record (IT does it in Entra/AD; NewVision stores that it happened).
4. Optional ticket field `identityVerifiedAt` + `verifiedById` (one timestamp). That is the security practice HDI implied: resets without verification are the breach path.

### C.2 Employee how-to library (not a KB product) — **Need — S–M**

**Why.** Freshservice: 11–50 articles is the useful range; >70% of orgs have a KB. HDI: KCS lifts FCR. `FUTURE_IDEAS.md` blocks a **configurable KB engine and article suggestions**. A **fixed** set of employee FAQs under `/help` (already visible to all roles, `access.ts` `help` = true) is in scope.

**Do:** 12 articles, Employee tone, no admin chrome: Wi-Fi per office, VPN, MFA lost phone, Outlook search, printer add, “my laptop is slow,” “raise a ticket,” “I am leaving — return kit,” toner, shared drive access (then ticket), phishing “what to do.” Link them from **My IT**.

**Do not:** search-ranked KCS, AI suggest-from-ticket, multi-author CMS.

### C.3 Move employee (JML mover) — **Need — M**

**Why.** Joiners and leavers have APIs. Movers are how laptops “ghost” to the wrong city ([Bynarize JML](https://bynarize.com/insights/it-asset-handover-joiners-leavers-hrms)).

**Do:** `POST /employees/:id/move` `{ locationId, departmentId?, managerId?, moveAssets: true, reason }`. In one transaction: update employee; for each assigned asset, existing transfer helper to the new location. Attention: “location mismatch” if `asset.locationId !== employee.locationId`.

### C.4 OEM / AMC claim on the repair — **Need — M**

**Why.** Indian warranty claims fail on **missing invoice + serial + case number**, not on missing dashboards ([Laptop Repair World](https://www.laptoprepairworld.com/blog/laptop-warranty-claim-process-india/)). AMC coordination is a **register + claim file**, not a new module ([IMARC AMC coordination](https://www.imarcengineering.com/services/warranty-and-amc-coordination)).

**Do** on `AssetMaintenance`:

| Field | Purpose |
|-------|---------|
| `coverage` enum | `oem_warranty` / `amc` / `adp` / `chargeable` / `unknown` |
| `oemCaseId` | HP/Dell/Lenovo SR |
| `rmaNumber` | Courier/RMA |
| `claimInvoiceNo` | Default from `Asset.invoiceNo`, editable |
| `incidentKind` | `defect` / `accidental` / `liquid` / `lost` / `other` |

UI: “Create OEM claim” copies serial + invoice into the comment and sets status `under_repair`. Prompt **loaner** if the person has no second device.

Link `VendorContract` of type `amc`/`warranty` when `VendorContractAsset` already ties the laptop — **read**, don’t duplicate.

### C.5 Scan-to-audit on the sticker — **Need — M**

Already the top ITAM daily miss in `PRODUCT_GAPS`. Listed here because **AMPthilly 500+ = continuous audit** and Teqtivity “daily data audits.” Without write-back, Ishan’s afternoon walk is still a spreadsheet.

### C.6 Device identity strings — **Need — S**

Optional on `Asset`: `hostname`, `macAddress`, `imei`, `phoneNumber`, `osName`. Import CSV columns. L1 question: “which laptop is `NV-PUN-044` on the network?” GLPI/Snipe collect these; we will not run an agent (`FUTURE_IDEAS.md`).

### C.7 Offboard finishes the queue — **Need — S**

On offboard: reassign or resolve open `SupportTicket`s (pick in the dialog); `ChatChannelMember` delete for that user. Licence seats when C.9 exists.

### C.8 Major-incident / repeat-problem (thin) — **Nice — S** then **M**

**S:** Ticket checkbox `broadcastIncident` → in-app banner for staff “Outlook degraded — see TCK-…”. Chat `#it-ops` already exists; the miss is **employees** who never see chat.

**M (later):** `Problem` record: many tickets `duplicateOf` one parent. Not a full ITIL problem module.

### C.9 Licence seats on existing contracts — **Need — M**

ISO 19770 licence management at this scale: `ContractSeat { contractId, employeeId, assignedAt, returnedAt }` + usageCount derived. JML leaver reclaims. Do not build discovery.

### C.10 Warranty→AMC zero-gap queue — **Need — S**

Attention row: assets with `warrantyEnd` in 60 days **and** no linked `VendorContract` `amc` covering that asset. Existing contract renewal UI does vendor-level AMC; this is **laptop-level coverage continuity** ([AMC coordination: no gap](https://www.manufacturingplantindia.com/warranty-and-amc-coordination-consulting-services-for-manufacturing-plant-machinery-projects/)).

### C.11 Shift handoff without a new app — **Nice — S**

Canned `#it-ops` message template (Help + composer snippet):

```text
Handoff YYYY-MM-DD
Open P1: …
OEM waiting: (case ids)
Joiners tomorrow: …
Loaners overdue: …
```

My work already lists the facts; the template stops tribal knowledge. Matches incident.io “async by default.”

### C.12 Printer + toner as one motion — **Nice — S**

New category `printer`. Ticket template asks asset (printer) + “toner empty?”. If yes, `ConsumableIssue` from the template. Daily printer tickets are #2 after passwords ([InvGate](https://blog.invgate.com/common-help-desk-tickets)).

### C.13 Courier between offices — **Nice — M**

Three cities. `AssetTransfer.reason` is free text. Add optional `courierAwb` + status `in_transit` (status may already exist — use it). Not a logistics product.

---

## D. Already built — do not rebuild (stale-research trap)

These were “gaps” in [`RESEARCH_ADMIN_EFFICIENCY.md`](./RESEARCH_ADMIN_EFFICIENCY.md) and are **now in source**. Skip them in the next build prompt.

| Item | Where |
|------|--------|
| Assign to me + `I` | Ticket list/show, My work |
| Canned macros with status | `statusOnSend` |
| Issue kits | `IssueKit` + Settings |
| Bulk assign assets | Assets toolbar |
| My work ordered list | Dashboard |
| Contracts ending 14d, checklists, warranties 14d | My work |
| Agent viewing collision | Ticket presence |
| Maintenance linked to ticket | `supportTicketId` |
| Audit timestamps | `lastAuditedAt` / `nextAuditDueAt` (show page only) |
| Loaner date field | `expectedReturnAt` |
| Staff chat | `/chat` |

---

## E. Explicitly out — even if “ITIS does it”

| Practice | Why out |
|----------|---------|
| AD/Entra password reset API, Intune, Autopilot, remote wipe | Identity/MDM stack; `FUTURE_IDEAS.md` live directory sync |
| Remote control / TeamViewer | HDI FCR lever; security + licensing; not this product |
| Server/backup/UPS daily checks | Different role; eAuditor checklist |
| Configurable KB + AI suggest | `FUTURE_IDEAS.md` |
| SLA escalation engine | `FUTURE_IDEAS.md`; overdue email is the allowed slice |
| Full SAM / SCCM inventory | ISO 19770 optimisation tier |
| Calls, Teams federation | Chat non-goals |
| Phone-width admin | Tablet + scan-to-audit instead |

---

## F. Suggested implementation order (daily-practice value)

1. **C.1** Password/MFA template + verify timestamp + close macro *(tomorrow morning’s tickets)*  
2. **C.2** Twelve employee how-tos on `/help` + My IT links *(deflection without a bot)*  
3. **C.5** Scan-to-audit *(afternoon floor walk)*  
4. **C.4** OEM/RMA/coverage on maintenance *(the Indian hardware day)*  
5. **C.7** Offboard closes tickets/chat *(security + queue hygiene)*  
6. **C.3** Move employee *(ghost laptops)*  
7. **C.6** Hostname/IMEI/MAC *(L1 “which PC?”)*  
8. **C.10** Warranty→AMC attention  
9. **C.9** Licence seats  
10. **C.12** Printer category + toner template  
11. **C.11** Handoff snippet  
12. **C.8** Staff/employee incident banner  
13. **C.13** Courier AWB  

Run **live mail + notification targeting** from `PRODUCT_GAPS` in parallel or nothing in this list that “emails the admin” will be felt.

---

## G. How to know it worked (practice test, not a feature demo)

A real IT Admin morning after this list:

1. Unassigned lockout ticket → template, verify EMP code, NewVision reset link or “reset in M365” comment, macro resolve — **under 5 minutes** (Habr-class interrupt).
2. Employee opens My IT → “VPN” how-to → still stuck → ticket already categorized.
3. HYD laptop dead → maintenance coverage = OEM → case ID + invoice from asset → loaner with Friday return.
4. Walk Pune floor → scan sticker → `lastAuditedAt` today without opening the desktop app.
5. Priya moves Pune→Bhopal → one Move action → her laptop location matches.
6. Rahul’s last day → assets back **and** his four Excel tickets are not still “open” on Sunil’s Monday queue.

If those six are true, NewVision matches **ITIS daily practice**. If we add ServiceNow-shaped problem/change/CMDB instead, we will have spent the week on the wrong job.

---

## H. Sources

### Volume and service desk

- [TechTarget — password reset share and Forrester cost](https://www.techtarget.com/enterprise-software/tip/Resetting-passwords-in-the-enterprise-without-the-help-desk)
- [Gartner T-15-6454 figures (secondary summary)](https://www.passwordresearch.com/stats/study76.html)
- [HDI — password-reset practices (~30% of tickets)](https://www.thinkhdi.com/library/supportworld/2011/password-reset-practices)
- [InvGate — most common helpdesk tickets](https://blog.invgate.com/common-help-desk-tickets)
- [ITSM.tools — 10 common L1 issues](https://itsm.tools/common-it-help-desk-issues-and-fixes/)
- [ITIL 4 service desk processes](https://pdcaconsulting.com/itil-service-desk-processes-roles-best-practices/)
- [Freshservice Benchmark 2023 (KB ~70%, 1.2h/ticket)](https://freshservice.com/assets/resources/freshservice/Freshservice-Benchmark-Report-(FBR)-2023.pdf)
- [Freshservice / 7 KPIs 2024 (2.19h, 11–50 articles)](https://freshservice.com/assets/resources/freshservice/freshservice-it-service-management-benchmark-report-2024.pdf)
- [HDI FCR / KCS / remote control](https://www.thinkhdi.com/library/supportworld/2017/metric-of-month-first-contact-resolution-rate)

### ITAM / JML / audit cadence

- [Teqtivity ITAM daily checklist](https://teqtivity.com/itam-checklist-daily-practices-for-success/)
- [AMPthilly 2026 inventory cadence](https://ampthilly.com/blog/it-asset-inventory-checklist/)
- [ISO/IEC 19770-1](https://www.iso.org/standard/68531.html)
- [Licenseware — JML for ITAM](https://licenseware.io/joiners-movers-leavers-itam-process/)
- [xAssets — joiners and leavers](https://www.xassets.com/docs/itam-guide/asset-management/joiners-and-leavers)
- [ITDEVTECH — onboarding/offboarding lead time](https://itdevtech.com/blog/it-onboarding-offboarding-service-desk-process-guide)
- [Hives — Indian MSME new-hire IT checklist](https://hives.cloud/blog/it-admin-checklist-new-hire-onboarding)
- [InvGate — Intune is not ITAM](https://blog.invgate.com/intune-asset-management)

### India hardware / AMC / jobs

- [Laptop warranty claim process (India)](https://www.laptoprepairworld.com/blog/laptop-warranty-claim-process-india/)
- [Warranty and AMC coordination (zero-gap renewal)](https://www.manufacturingplantindia.com/warranty-and-amc-coordination-consulting-services-for-manufacturing-plant-machinery-projects/)
- [Shine — IT Admin Support JD (dispatch, AMC, credentials)](https://www.shine.com/jobs/it-admin-support/weekday-ai/19084832)
- [r/developersIndia — damaged company laptop → IT/AMC, not local shop](https://www.reddit.com/r/developersIndia/comments/1k2yp3p/company_laptop_got_damaged_while_travelling_in/)

### Handoff / ops vs NOC

- [incident.io async handoff](https://incident.io/blog/async-on-call-handoff-template)
- [Shiftctl on-call handover 2026](https://shiftctl.com/blog/on-call-handover-guide)
- [eAuditor daily IT operations (sysadmin — out of scope)](https://eauditor.app/2026/08/10/daily-it-operations-checklist-2/)

### In-repo

- [`backend/prisma/schema.prisma`](./backend/prisma/schema.prisma) — assets, tickets, maintenance, contracts, kits
- [`backend/prisma/seed.ts`](./backend/prisma/seed.ts) — ticket categories including `access_account`
- [`FUTURE_IDEAS.md`](./FUTURE_IDEAS.md) — KB engine, AD sync, SLA engine
- [Part 1](#part-1) — scan, licences, offboard tickets, mail
- [`RESEARCH_ADMIN_EFFICIENCY.md`](./RESEARCH_ADMIN_EFFICIENCY.md) — dated 2026-09-11; several items shipped

---

## I. One-line recommendation

NewVision already covers **inventory + a Spiceworks-class desk**. Daily ITIS still needs the **password playbook**, **employee how-tos**, **sticker audit**, **OEM case file**, and **mover/leaver finishing the queue**. That is the functionality to add. Not a monitoring suite, not Intune, not another chat rebuild.


---

<a id="part-4"></a>

# Part 4 — Vendor and support-ticket enhancements

_Merged from `VENDOR_AND_TICKET_ENHANCEMENTS.md`. Text below is the original report._

# NewVision — Vendor & Support Ticket enhancements

**Investigation and planning only.** No application code was changed in this pass.

**Scope of this file.** Two modules only:

1. **Vendors** (the supplier master — not the full PR→PO→GRN engine, except where the vendor record is the hole).
2. **Support tickets** (the helpdesk — not Chat UI, not hardware Requests, except links).

**Sister files (do not duplicate blindly).**

| File | Use for |
|------|---------|
| [Part 1](#part-1) | Security leftovers, email-not-live, scan, RBAC |
| [Part 3](#part-3) | Daily ITIS habits (password playbook, OEM case, employee FAQ) |
| [`RESEARCH_ADMIN_EFFICIENCY.md`](./RESEARCH_ADMIN_EFFICIENCY.md) | Dated 11 Sep — several ticket items **already shipped** |
| [`FUTURE_IDEAS.md`](./FUTURE_IDEAS.md) | Supplier portal, OCR, PunchOut, SLA engine, full merge/split, KB product, CSAT re-send |

Help already tells the truth on two hard limits: **NewVision does not move money**, and **duplicate-of is not a merge**. Enhancements below stay inside that.

---

## 0. Short Hindi brief

**Vendors:** Master pe legal name, GST/PAN ek hi `taxId`, bank dual-control, preferred, suspend/blacklist, contacts, scorecard, compliance files — yeh hai. Roz ke Indian AP rules **nahi** hain: alag GSTIN+PAN, GSTIN se PAN match, duplicate vendor (same GSTIN/account), MSME/Udyam + 45-din clock, cancelled cheque, **khud ke bank change ko khud approve**, invoice number unique nahi, repair `vendor` abhi bhi free text.

**Tickets:** Queue mature hai — statuses, Assign to me, macros, presence, duplicate-of, SLA first-response, watchers, email-in *code*, CSAT, reports. Roz ki kammi: **inbound mail attachments**, **overdue email**, **close codes**, **tags**, closed-ticket pe reply **naya follow-up** nahi (Zendesk style) — abhi *reopen in place*, **resolution SLA** (sirf first-response), OEM/vendor se link, printer category, employee how-to.

Is file mein **add-karne layak** cheezein ranked hain. ServiceNow / Ariba / GST filing / vendor self-portal **mat banao**.

---

## A. What already exists (so we do not rebuild)

### A.1 Vendors — current source

Grounded in `Vendor` / `VendorContact` / `VendorComplianceDoc` / `VendorScorecard` (`schema.prisma`), `vendors.controller.ts`, `vendors.service.ts`, Help `procurement-vendors`.

| Capability | Notes |
|------------|--------|
| Codes `VND-…`, legal + trading name, country default IN | |
| One `taxId` labelled “GST / VAT / registration” | Free text. No format. No separate PAN. |
| Addresses, payment terms string (`Net 30`), INR | `netDays()` parses Net-N for invoice overdue |
| Bank account + IFSC; **pending** fields + `approve-bank` | Dual *steps*, not dual *people* — same IT Admin can request and approve |
| Statuses draft → pending_approval → active / suspended / blacklisted | Reason required on status change |
| Preferred flag; internal owner; next review date | Review date is not on My work |
| Contacts (primary) | Replace-all on update |
| Compliance file upload (8 MB) + optional `expiresAt` | No dashboard “expired GST cert” |
| Manual scorecard (on-time / quality / price / responsiveness) | `GET :id/kpis` also **computes** on-time from PO vs first GRN |
| List search on name / code / taxId | No “this GSTIN already exists” block |
| Roles | **Current source:** `@Roles(SUPER_ADMIN, IT_ADMIN)` on list/get/create. Manager vendor **API leak in `PRODUCT_GAPS` is fixed in this controller.** Keep it that way. |
| Selectability | Suspended/blacklisted cannot go on new PR/PO |

Procurement around the vendor (already built, not this file’s build list): approval matrix, 3-way match with tolerance (`match.ts`), invoice payment **status**, contracts 90/60/30/7, GRN handoff.

### A.2 Support tickets — current source

Grounded in `SupportTicket` + `tickets.controller.ts` / `tickets.service.ts` / list+show UI / Help `tickets-*`.

| Capability | Notes |
|------------|--------|
| Portal + email channels | Walk-up / chat-as-ticket **not** a channel |
| Statuses including `reopened`; waiting clock pauses SLA | |
| Priorities + first-response **minutes** in Settings | No **resolution** target |
| Assign, assign-to-me, bulk assign/close, `I` shortcut | |
| Public vs internal comments, watchers, @mentions | |
| Canned macros with `statusOnSend` | |
| Templates at create | |
| Duplicate-of (closes pointer; comments stay) | Not Zendesk merge |
| Presence “X viewing” (in-memory ~25s) | Not typing lock |
| Requester assets side panel + `link-asset` | |
| Time logs, CSAT once, skip if reopened | |
| Quick views + saved views + last-view persist | |
| Reports + CSV/PDF | Volume, ART, overdue, CSAT avg — no histogram |
| Email-in match by Message-ID then `[TCK-…]` | **No MIME attachments.** Reply to **resolved/closed reopens the same ticket** (`tickets.service.ts` ~599–609) |
| Copy-email to Outlook | |
| Categories | `software`, `network`, `access_account`, `hardware_other`, `general` — **no printer** |

---

## B. Research: what “good” looks like (and what we will not copy)

### B.1 Indian vendor master (AP / KYC) — not Ariba

Indian finance SOPs treat the vendor master as **identity + tax + payee**, with maker-checker:

- Single governed master: legal name, **GSTIN**, **PAN**, TDS category, Udyam/MSME, payment terms, bank + IFSC. Validate GSTIN format, legal name on the [GST portal Search Taxpayer](https://www.gst.gov.in/), PAN embedded in GSTIN (characters **3–12**), bank via cancelled cheque / penny-drop — **never from an email body alone**. Sources: [AI Accountant — vendor MDM](https://www.aiaccountant.com/blog/vendor-master-data-management-clean), [CFO Matrix vendor onboarding SOP](https://cfomatrix.in/insight/finance-sops-controls/vendor-onboarding-sop-kyc-msme-bank-verification), [MonitorPay — verify Indian supplier banks](https://monitorpay.ai/how-to-verify-indian-supplier-bank-accounts/).
- Duplicates: same GSTIN, same PAN, same account number, normalised legal name.
- **MSME:** Udyam number + micro/small/medium. MSMED Act s.15: pay in **15 days** if no written terms, or agreed terms **capped at 45 days** from acceptance. Income-tax **s.43B(h)** (AY 2024–25+): late pay to **micro/small** (mfr/services) → deduction delayed to the year you actually pay. GSTIN ≠ MSME; bridge is **PAN → Udyam**. Sources: [TaxGuru 43B(h)](https://taxguru.in/income-tax/section-43b-h-and-msme-complete-guide.html), [EaseMyOffice GST vs Udyam](https://easemyoffice.in/blog/how-to-check-msme-registration-by-gst-number/).
- MCA: accounting software **audit trail on** — NewVision already appends `audit_logs` + procurement activity log. The gap is **fields**, not “add a log.”
- DPDP 2023: vendor **contact person** is personal data; GSTIN/PAN of a company is not. Do not dump contacts into public Help screenshots.

**Precoro** (mid-market India pitch): line-level CGST/SGST/IGST, GSTIN + place of supply, 3-way match, **duplicate invoice flag**, supplier portal, OCR. Sources: [Precoro India](https://precoro.com/to/procurement-software-for-india), [3-way match help](https://help.precoro.com/3-way-match-functionality), [product — duplicate invoices](https://precoro.com/product).

NewVision **already has 3-way match**. Copy from Precoro: **duplicate invoice number per vendor**, GSTIN on the master, not a tax engine and not a supplier portal (`FUTURE_IDEAS.md`).

### B.2 Helpdesk (Zendesk / Freshservice / JSM) — internal IT size

| Pattern | What the suites do | NewVision analogue | Take |
|---------|--------------------|--------------------|------|
| Macros | Reply + fields | Canned + `statusOnSend` | **Have.** Add password-close macro (`ITIS_DAILY_PRACTICE`). |
| Collision | Freshservice eye + pencil ([article](https://support.freshservice.com/support/solutions/articles/50000000941-detecting-agent-collision-in-tickets)) | Viewing list | **Have** viewing. Typing lock = Nice. |
| Merge | Zendesk merge into one thread | Duplicate-of | Keep pointer. Full merge **deferred**. |
| Follow-up | Reply to **closed** → **new** ticket, channel “Closed ticket” ([Zendesk](https://support.zendesk.com/hc/en-us/articles/8421655952026-Understanding-follow-up-tickets)) | Same id **reopened**, CSAT skipped | Enhancement: optional follow-up child instead of reopen — preserves CSAT on the original. |
| Child / linked | Linked Ticket app — second conversation (OEM, facilities) | `duplicateOf` one-way; maintenance FK | **Need:** `linkedTicketId` or OEM child, not merge. |
| Side conversations | Zendesk email-out to Finance without the requester | Staff chat + internal notes | **Have.** Don’t add a third thread type. |
| Light agents | View + public comment | Manager: own + reports, no assign/internal | **Have.** |
| SLA | Multiple policies, business hours | First-response minutes, 24×7 clock | Add **resolution** target; business hours **Nice**. Engine **deferred**. |
| CSAT | Reminders | Rate once; reopen kills prompt | Reminder **Nice** (`FUTURE_IDEAS` blocks *scheduling product*; one 48h nudge is not that). |
| Tags | Zendesk reporting glue | None | Simple `String[]` **Need** for “printer / vip / major-incident”. |
| KB / FCR | Freshservice: 11–50 articles useful | Staff product Help | Employee how-tos in `ITIS_DAILY_PRACTICE` — not a KB engine. |
| Attachments from mail | Table stakes | Missing | **Need.** |

Password volume (20–50% of calls) stays in the ITIS file; this file only lists the **ticket-shaped** pieces (template, tags, close code).

---

## C. Vendor enhancements (ranked)

Need vs Nice. Effort S/M/L. **api** = schema/API, **ui** = mostly frontend.

### C.1 GSTIN + PAN as real fields, not one `taxId` — **Need — S–M** · api+ui

**Why.** Indian activation checklist is GSTIN + PAN + name match. Characters 3–12 of a 15-char GSTIN **are** the PAN. One text box cannot enforce that. Precoro stores GSTIN per supplier; we do not need CGST lines yet.

**Do:**

- `gstin` (15, regex `[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}` — keep a documented exception for unregistered / foreign).
- `pan` (10, `[A-Z]{5}[0-9]{4}[A-Z]`).
- On save: if both present, `gstin.slice(2,12) === pan` or block.
- Keep `taxId` as a migrated copy or drop after backfill.
- Unregistered: checkbox `gstUnregistered` + declaration file in compliance docs.
- UI: link to GST portal Search Taxpayer (human verifies). **Do not** scrape the portal (ToS / brittle). Optional later: GSP API.

**Do not:** e-invoice IRN, GST return filing.

### C.2 Duplicate vendor guard — **Need — S** · api

**Why.** Ghost vendors and double masters are the #1 AP fraud setup ([vendor payments / maker-checker](https://www.xflowpay.com/blog/vendor-payments)).

**Do:** Before create/activate, 409 if another row has same `gstin` or `pan` or (normalised digits) `bankAccountNumber`. Search-as-you-type on New vendor using existing `q=`. Merge-vendors is **Nice** later (keep the newer as alias).

### C.3 Maker ≠ checker on bank (and on activate) — **Need — S** · api

**Why.** SOP: the person who typed bank details is not the confirmer. Email-only bank changes are a classic redirect fraud. NewVision already *holds* pending bank — then **any** IT Admin can `POST approve-bank`, including the editor.

**Do:** `approveBank` 400 if `actor.id` is the last `bank_change_pending` log actor. Same rule: activating `draft`/`pending_approval` cannot be the creator (or require Super Admin if only one admin exists — document the exception).

**Do not:** penny-drop API (banking partner). Store **account holder name** and require it to match legal name (string compare, human override with reason).

### C.4 Unique invoice number per vendor — **Need — S** · api

**Why.** Precoro “flag duplicates automatically.” `VendorInvoice.invoiceNumber` has **no** `@@unique([vendorId, invoiceNumber])`. Double-pay risk.

**Do:** unique constraint + 409. Soft-allow suffix `-CORR` only via Super Admin. Optional: warn if amount+date+vendor match within 7 days even with different numbers.

### C.5 MSME / Udyam tag — **Need (India) — S** · api+ui

**Why.** 43B(h) + MSMED 45-day cap. Finance will ask in the first statutory audit. NewVision already has `paymentTerms` and invoice `dueDate`.

**Do:** `udyamNumber`, `msmeClass` enum `none | micro | small | medium | unknown`. If micro/small, default new invoice dueDate to **min(terms, 45 days from invoiceDate/GRN accept)**. Attention: MSME invoices `paymentStatus=pending` past due. Help: “we track the clock; we do not pay.”

Medium enterprises and traders: tag only, no 43B(h) clock (per TaxGuru FAQs).

### C.6 Compliance expiry + vendor review on My work — **Need — S** · api (query) + ui

**Why.** GST certificate / cancelled cheque / AMC insurance expire. `expiresAt` and `nextReviewDate` already exist and are invisible.

**Do:** Attention rows: docs expiring 30 days; `nextReviewDate <= today+14`; `bankChangePending`. Link to vendor show.

### C.7 Search-before-create + cancelled cheque type — **Need — S** · ui

**Why.** MDM: search GSTIN before create. SOP: cancelled cheque or bank letter attached.

**Do:** New vendor form: search existing by GSTIN first. Compliance upload `docKind`: `gst_certificate | pan | cancelled_cheque | msme | other`. Block **activate** if active Indian vendor has no cheque/PAN unless Super Admin override.

### C.8 Repair vendor is a real Vendor — **Need — S** · api+ui

**Why.** `AssetMaintenance.vendor` is still a **string** (`PRODUCT_GAPS`, `ITIS_DAILY_PRACTICE`). Scorecards/`openDefects` already count maintenance by `asset.vendorId`, so unlinked repairs never hit the OEM’s KPI.

**Do:** `vendorId` FK on maintenance; deprecate the string. Picker = active vendors in category `repair` / `oem`.

### C.9 Tally/Zoho vendor CSV — **Need — S** · api

**Why.** Precoro-level GST breakup is Finance’s books. Gap in `PRODUCT_GAPS`: **export a clean bill/vendor CSV**, don’t file GST.

**Do:** `GET /vendors/export` — code, legal name, GSTIN, PAN, IFSC masked-or-full (IT Admin), MSME, status. Invoice export already exists in procurement — add vendor GSTIN column.

### C.10 Nice (vendors)

| Item | Why | Size | Watch |
|------|-----|------|--------|
| `accountHolderName` + IFSC format (`^[A-Z]{4}0[A-Z0-9]{6}$`) | Bank SOP | S | |
| TDS section `194C/194J/194H` + deductee type | India AP; Zoho still files | S | Don’t calculate TDS |
| Place of supply / GSTIN state vs office | Precoro; three NV offices | M | Nice until Finance asks |
| Auto-fill scorecard from `computedKpis` | Stop fake 100s | S | Keep human override |
| Vendor merge (alias GSTIN) | After duplicates exist | M | |
| Multi-GSTIN (one legal, many states) | Precoro multi-GSTIN | L | Out unless they operate that way |
| Quarterly “GSTIN still active?” reminder | MonitorPay monthly GST watch | S | Checkbox `gstinVerifiedAt`, not a bot |
| Preferred-vendor buy-from-catalog | Precoro catalogs | L | Deferred with PunchOut |

### C.11 Vendor — do not build

Supplier self-portal, PunchOut, OCR, e-invoicing IRN, reverse auction, GL/payment execution, GSP live GST API as a blocker, penny-drop as a blocker, MCA CIN scrape. All are `FUTURE_IDEAS.md` or a Finance product.

---

## D. Support ticket enhancements (ranked)

### D.1 Inbound email attachments — **Need — M** · api

**Why.** Zendesk/JSM table stakes. `email-parser.ts` keeps text/HTML; screenshots in mail never become `TicketAttachment`. Help says paste/upload **in the portal**.

**Do:** Parse multipart file parts with the **same allow-list as chat** (`chat-files.ts`), not the weaker ticket list (`PRODUCT_GAPS` #224). Cap size. Store as existing `TicketAttachment`. Keep body as text (no HTML render).

**Ops:** live IMAP still required or this only helps the ingest webhook.

### D.2 Reply to closed → follow-up ticket (don’t destroy CSAT) — **Need — M** · api+ui

**Why.** Zendesk: closed + new mail = **new** follow-up ticket; CSAT on the original stays. NewVision **reopens** the same row and sets `ratingPromptDropped`. Agents lose the “we closed it” metric; employees think nothing was solved.

**Do:** If inbound comment and status is `closed` (not `resolved` waiting for rate): create `TCK-new` with `followUpOfId`, copy requester/category/asset, first comment = the mail. Banner on both. Keep **resolved** → requester comment = reopen (conversation still warm). Document in Help.

### D.3 Resolution / close codes — **Need — S** · api+ui

**Why.** Volume reports without “how it ended” cannot steer ITIS (password vs hardware vs how-to). HDI/FCR programmes need a reason.

**Do:** Required on `resolved`/`closed`: enum `fixed | workaround | duplicate | unable_to_repro | cancelled | known_error | other` + optional note. Reports: count by code. Map duplicate-of to `duplicate` automatically.

### D.4 Tags — **Need — S** · api+ui

**Why.** Zendesk reporting and major-incident banners are tag-shaped. Categories are too coarse (`hardware_other` hides printers).

**Do:** `tags String[]` on ticket. Chips on list. Suggested: `printer`, `password`, `vpn`, `vip`, `major`, `oem`. Filter `?tag=printer`. Not a custom-field builder (`FUTURE_IDEAS.md`).

### D.5 Resolution SLA (second clock) — **Need — S** · api+ui

**Why.** Settings only store **first-response** minutes. Freshservice/JSM agents live on **time to resolve**. Overdue My work today is first-response flavoured.

**Do:** `TicketPriorityTarget.resolveMinutes` nullable. Chip “Resolve overdue”. Pause with the same waiting clock. **No** escalation engine (deferred).

### D.6 Email when *my* ticket goes overdue — **Need — S** · api (mailer)

**Why.** Visual overdue is easy to miss. Full SLA rules engine is deferred. One mail to assignee + watchers is the allowed slice (`ITIS` / `PRODUCT_GAPS`).

**Do:** Cron (with existing 8am jobs): tickets newly crossing first-response or resolve target since last run. De-dupe per ticket+threshold like contracts.

Depends on **live mail**.

### D.7 Linked / child ticket (OEM, facilities) — **Need — S** · api+ui

**Why.** Zendesk Linked Ticket: second conversation without merging. Hardware already has `maintenance.supportTicketId`. Missing: ticket ↔ ticket (e.g. employee Outlook + “ask network team”).

**Do:** `parentTicketId` nullable. UI “Create linked ticket”. Parent shows children. Closing parent does **not** auto-close children (Zendesk same limitation — correct).

Use this for OEM vendor email: child is internal, parent stays employee-facing — cheaper than side-conversations.

### D.8 Ticket ↔ Vendor on hardware rows — **Need — S** · ui+api

**Why.** Daily ITIS: Dell SR lives with the vendor, not only in a comment.

**Do:** Optional `vendorId` on `SupportTicket` (or only on maintenance — prefer one place: maintenance C.8 + ticket already has `assetId`). Show vendor + `oemCaseId` on ticket once C.8/ITIS OEM fields exist.

### D.9 Printer category + password template — **Need — S** · seed+ui

**Why.** InvGate/ITSM.tools: printers #2, passwords #1. Categories omit printer. `access_account` exists but no template/macro bundle.

**Do:** Seed category `printer`. Templates from `ITIS_DAILY_PRACTICE` C.1–C.2. Tag `password` / `printer` on those templates.

### D.10 Upload allow-list = chat; sanitize download filename — **Need — S** · api

Already in `PRODUCT_GAPS`. Listed here because it is a **ticket** hole vs chat.

### D.11 Super Admin can raise as self — **Need — S** · seed

Super Admin has no `employeeId` → cannot create. Link a staff employee row.

### D.12 Nice (tickets)

| Item | Why | Size | Watch |
|------|-----|------|--------|
| CSAT one reminder at 48h if unrated | Zendesk nags; `FUTURE_IDEAS` blocks a scheduler product | S | One cron, one mail |
| Collision **typing** indicator | Freshservice pencil | S | Presence map already there |
| Next/prev ticket `J`/`K` | JSM queues | S | `?` is Help — use `J`/`K` only when list focused |
| Auto-assign round-robin unassigned | Freshservice Dispatch'r | M | Optional; two staff |
| Walk-up channel enum | HDI ~1.4% contacts | S | `channel=walkup` |
| Business hours | Clock shouldn’t eat nights | M | Deferred-ish; Nice |
| CSAT trend on `/tickets/reports` | Help claims satisfaction; no sparkline | S | |
| Major-incident tag → employee banner | `ITIS` C.8 | S | Tag `major` |
| Requester satisfaction comment on list | Agents fear CSAT | S | |

### D.13 Tickets — do not build

Configurable routing rules, AI classify, omnichannel social, voice, SLA *engine*, ticket merge/split product, custom fields builder, multi-mailbox, light-agent marketplace, Confluence KB, side-conversation email-out (use chat), CSAT campaign builder.

---

## E. Cross-module (vendor × ticket)

These are the only places the two modules should grow **toward each other**:

1. Maintenance `vendorId` (C.8) + ticket `assetId` (have) + OEM case fields (`ITIS`) = one hardware incident.
2. Linked child ticket (D.7) when IT must write to Dell while the employee stays on the parent.
3. Vendor blacklist → cannot pick on PR **and** show a banner on open maintenance for that OEM.
4. Do **not** let vendors log into tickets (supplier portal deferred).

---

## F. Implementation order

### Vendors (after / with `PRODUCT_GAPS` bank masking — already IT-Admin-only in current controller)

1. C.4 Unique invoice number *(stops double pay this week)*  
2. C.2 Duplicate GSTIN/PAN/account  
3. C.1 GSTIN + PAN fields + checksum  
4. C.3 Maker ≠ checker on bank/activate  
5. C.7 Search-before-create + cheque doc kind  
6. C.5 MSME tag + 45-day due default  
7. C.6 Expiry/review on My work  
8. C.8 Maintenance → Vendor FK  
9. C.9 Export CSV  

### Tickets (after / with live mail)

1. D.10 Attachment allow-list = chat  
2. D.1 Inbound MIME files  
3. D.3 Close codes  
4. D.4 Tags  
5. D.9 Printer category + password template  
6. D.5 Resolution SLA minutes  
7. D.6 Overdue mail  
8. D.2 Follow-up-on-closed  
9. D.7 Linked tickets  
10. D.11 Super Admin employee  
11. D.8 Vendor on hardware ticket (after C.8)  

---

## G. Success tests (practice, not a feature tour)

**Vendor**

1. Create “Dell India” twice with the same GSTIN → second save **409** with a link to `VND-…`.  
2. GSTIN `27ABCDE1234F1Z5` + PAN `WRONGPAN00A` → blocked.  
3. Ishan changes bank; Ishan clicks Approve → **400**; Sara approves → live.  
4. Same vendor invoice `INV-100` twice → 409.  
5. Micro Udyam vendor: new invoice due date **≤ 45 days**.  
6. Laptop under_repair picks **Vendor** Dell, not the string `"dell"`. KPI openDefects moves.

**Tickets**

1. Mail with PNG → file on the ticket (when ingest is on).  
2. Employee replies to **closed** TCK-1 → **TCK-2** follow-up, TCK-1 CSAT intact.  
3. Resolve requires a close code; reports show `password` vs `fixed`.  
4. Filter `tag=printer`.  
5. High priority resolve target fires overdue mail to assignee.  
6. “Create linked ticket” for OEM; employee never sees the Dell thread.

---

## H. Sources

### Vendors / India AP

- [Vendor master MDM (GSTIN, PAN, TDS, duplicates)](https://www.aiaccountant.com/blog/vendor-master-data-management-clean)
- [CFO Matrix — KYC, MSME, bank, cancelled cheque, maker-checker](https://cfomatrix.in/insight/finance-sops-controls/vendor-onboarding-sop-kyc-msme-bank-verification)
- [MonitorPay — GST portal search, 43B(h), Udyam](https://monitorpay.ai/how-to-verify-indian-supplier-bank-accounts/)
- [xFlow — vendor payments, duplicate invoices, DPDP note on contacts](https://www.xflowpay.com/blog/vendor-payments)
- [TaxGuru — MSMED s.15 + 43B(h)](https://taxguru.in/income-tax/section-43b-h-and-msme-complete-guide.html)
- [EaseMyOffice — GSTIN is not MSME; PAN bridge](https://easemyoffice.in/blog/how-to-check-msme-registration-by-gst-number/)
- [Precoro India GST + 3-way + duplicates](https://precoro.com/to/procurement-software-for-india)
- [Precoro 3-way match](https://help.precoro.com/3-way-match-functionality)
- [Precoro product (supplier portal / OCR — **out**)](https://precoro.com/product)

### Tickets / ITSM

- [Freshservice agent collision](https://support.freshservice.com/support/solutions/articles/50000000941-detecting-agent-collision-in-tickets)
- [Zendesk follow-up tickets](https://support.zendesk.com/hc/en-us/articles/8421655952026-Understanding-follow-up-tickets)
- [Zendesk Linked Ticket / child](https://support.zendesk.com/hc/en-us/articles/4408820849434-Installing-and-using-the-Linked-Ticket-app)
- [Zendesk CSAT on follow-ups](https://support.zendesk.com/hc/en-us/articles/4408843312922-Do-follow-up-tickets-send-satisfaction-surveys-if-the-original-ticket-already-sent-one)
- [Zendesk vs JSM 2025 (macros, SLA, side conversations)](https://www.kustomer.com/resources/blog/zendesk-vs-jira-service-management/)
- [InvGate common ticket types](https://blog.invgate.com/common-help-desk-tickets)

### In-repo

- `backend/prisma/schema.prisma` — `Vendor`, `VendorInvoice`, `SupportTicket`
- `backend/src/procurement/vendors.service.ts` — bank pending, KPIs, mask
- `backend/src/procurement/match.ts` — 3-way match (keep)
- `backend/src/tickets/tickets.service.ts` — reopen-on-comment, duplicate-of
- `backend/src/tickets/email-inbox.service.ts` — ingest without attachments
- `frontend/src/help/articles.ts` — `procurement-vendors`, `tickets-it-queue`, `tickets-email-in`
- [`FUTURE_IDEAS.md`](./FUTURE_IDEAS.md)

---

## I. One-line recommendation

**Vendors:** turn `taxId` into GSTIN+PAN with duplicate and maker-checker discipline, unique invoices, MSME clock, and hook repairs to the master — not a supplier portal. **Tickets:** attach mail files, close codes, tags, a second SLA clock, follow-up-on-closed, and linked OEM children — not Zendesk Suite. Together that is the enhancement list worth building next.


---

<a id="part-5"></a>

# Part 5 — Company, clients, and how they approach you

_Merged from `COMPANY_AND_CLIENT_GROWTH.md`. Text below is the original report._

# NewVision — Company, clients, and how they actually approach you

**Investigation and planning only.** No application code was changed in this pass.

**Question this file answers.** If we want to take this product **much higher** and **stand up a real company** — not a demo for one estate — what else is required so **clients can approach and start easily**? Functionality is included only where it changes that motion. Feature theatre (another ITSM module) is called out as a trap.

**This is not** another module gap list. Those already exist:

| File | Job |
|------|-----|
| [Part 1](#part-1) | Security, RBAC, email, scan — **table stakes before you take money** |
| [Part 3](#part-3) | What IT Admin does every day |
| [Part 4](#part-4) | Vendor master + helpdesk |
| [Part 2](#part-2) | Chat look-and-feel |
| [`FUTURE_IDEAS.md`](./FUTURE_IDEAS.md) | What we still refuse (ServiceNow-shaped) |

---

## 0. Short Hindi brief

Abhi NewVision **ek company ka internal IT software** hai (login pe “NewVision Softcom directory”, seed 1,250 assets, demo `Password123!`). Company khadi karne ka matlab hai: **dusri companies client banen**, paise den, 2 hafte mein live hon.

Client asani se approach kare — yeh features se zyada **approach path** hai:

1. Public site + price + GST invoice + 15-min demo (Excel se import).
2. Pehle ghante mein **aha**: “Rahul ke paas kaunsa laptop hai” dikh jaye.
3. Trust: India region, DPDP/DPA, koi printed password nahi, Swagger band.
4. Multi-tenant (har client ka data alag) — bina iske yeh product nahi, project hai.
5. Freshservice/Snipe se **sasta + India-shaped + helpdesk+ITAM+AMC ek jagah** — ServiceNow mat bano.

Jo module add karoge usse pehle yeh 5. Warna client aayega, login pe dummy password dekhega, Singapore hosting puchega, aur chala jayega.

---

## A. Honest diagnosis: what we have vs a company

| Lens | Today | A company that sells this |
|------|--------|---------------------------|
| Customer | One fictional tenant (NewVision Softcom) | Many named companies |
| Login copy | “Use your NewVision Softcom directory account” + pre-filled demo password | Their domain, their admin, empty or *their* sample |
| Data | Single Postgres, `render.yaml` Singapore, `ipAllowList: []` | Tenant isolation, India region option, allow-list |
| Money | None | INR price, GST tax invoice, trial clock |
| Trust pack | Public Swagger historically; JWT in localStorage; no SOC 2 | Security one-pager, DPA, VAPT, subprocessors |
| First hour | Welcome card: location → category → employee → asset (4 clicks, empty tables) | Import 50-row Excel → assign one laptop → employee raises a ticket |
| Brand | Internal ITAM | Named product (keep NewVision or spin a product name) sold to *other* IT teams |
| Sales | GitHub + Render URL | Website, WhatsApp, INR quote, partner (AMC firms) |

`SEED_MODE=bootstrap` and `FirstRunWelcome` are the **start** of productization. They are not a company. A second client cannot sign up without you cloning the repo.

**Rule:** more tickets/vendors/chat polish helps *retention after they pay*. It does not create the company. The company is created by **packaging + trust + time-to-value + a way to pay**.

---

## B. Who the first 20 clients actually are (ICP)

Do not sell to Infosys or to a 12-laptop cafe.

**Primary ICP (year 1):** Indian company, **80–800 people**, **2–5 offices or a factory + HO**, IT team of **1–6** (one IT Admin + one Support is the median). Today they run:

- Excel / Google Sheet asset register that lies after the second branch ([Siriusstar: Excel dies at branches and handovers](https://siriusstar.in/it-asset-management-software-india/); [AssetPrime vs Excel](https://assetprime.org/asset-management-software-vs-excel)).
- WhatsApp + Outlook for “laptop nahi chal raha.”
- AMC vendor on speed-dial, warranty claims in a folder of invoices.

**Economic buyer:** IT Admin / IT Manager (user) + Founder/CFO (pays when an audit, insurance, or lost laptop happens).

**Why they pick you instead of Freshservice / Snipe-IT / Excel:**

| Alternative | Why they look | Why they bounce | Your wedge |
|-------------|----------------|-----------------|------------|
| Excel | Free | Three offices, warranty, “who has the charger” | Import their sheet **today** |
| Snipe-IT self-host | Free, no cap | They must patch a web app; [CVE-2026-37709](https://siriusstar.in/it-asset-management-software-india/) is the cautionary tale | **Hosted**, you patch |
| Snipe-IT cloud | ~$40/mo | USD, no India GST/AMC/helpdesk in one | INR + GST + tickets + AMC |
| Freshservice | Polished desk + ITAM | Per-agent + Asset Units; 2–4 week implement; feels like ITSM ([IT for SME India](https://www.itforsme.in/solutions/freshservice-for-indian-companies)) | Go-live in **a day** if they have a CSV; fewer modules |
| AssetExplorer free | Discovers 25 assets | Hard cap 25 | No fake free cap that dies at 26 |
| Hives AMS | ₹199/user/mo India-priced ([Hives MSME stack](https://hives.cloud/blog/microsoft-365-alternative-india-msme)) | Point asset tool | Desk + procurement + scan in one |
| ServiceNow | “Enterprise” | 3–6 months, price | Explicit non-goal |

**Jobs to be done (buy trigger):**

1. Auditor / client / insurer asked “show the register.”
2. A laptop left with an ex-employee.
3. Second office opened and Excel forked.
4. AMC renewal and nobody knows which serials are covered.

If you cannot show **that job in 15 minutes**, they will not approach a second time.

---

## C. Why a client cannot approach easily *today*

“Approach” = they found you, trusted you enough to talk, and could start without a 4-week SI project.

| Blocker | Evidence in this repo | What the client feels |
|---------|----------------------|------------------------|
| No public product site | README is a developer quick start | “Is this a GitHub toy?” |
| No price | None | They will not email to hear “custom” |
| Login is another company’s directory | `login.tsx` Softcom copy + demo accounts | This is *their* competitor’s tool |
| Production trust | Singapore host, demo passwords historically, Swagger, no rate limit (`PRODUCT_GAPS`) | Security questionnaire fails on page 1 |
| Empty first-run is homework | `FirstRunWelcome` four setup links | Freshservice trial has sample tickets |
| Import exists but is not the hero | Settings → Import jobs | Excel users need **drag CSV on the welcome card** |
| Single tenant | One DB, one brand | You cannot onboard Acme without cloning |
| No GST tax invoice from *you* | App tracks *their* vendors | Their accounts payable cannot pay a SaaS vendor |
| Sleeping Free Render | 15 min idle (`render.yaml`) | Trial feels broken |
| Chat/Teams replica unfinished | Part 2 | Do not lead sales with chat |

None of these are “add problem management.”

---

## D. What research says about “easy to start”

### D.1 Time-to-value (they will not read Help)

- Amplitude 2025: **>98%** of new users who never hit a value milestone churn in two weeks; **7% day-7 return** is top-quartile; that cohort predicts 3-month retention ([Digital Applied / Amplitude](https://www.digitalapplied.com/blog/customer-onboarding-time-to-value-2026-saas-metrics-framework)).
- Self-serve B2B: first value in **minutes**, not a tour. Visible **3–5 step checklist** (~50% higher activation than a modal) ([Cadence B2B onboarding](https://cadence.withremote.ai/blog/b2b-saas-customer-onboarding), [Product School PLG](https://productschool.com/blog/product-strategy/product-led-onboarding)).
- Sales-led ITSM: Freshservice India **2–4 weeks** go-live vs ServiceNow **3–6 months** ([IT for SME](https://www.itforsme.in/solutions/freshservice-for-indian-companies)). Your promise must be **same week**, or you are a worse Freshservice.

**Activation event for this product (pick one and instrument it):**

> **A1.** IT Admin has **≥10 assets** with an assignee **and** opened one employee profile (“who has what”).  
> **A2.** One **ticket** went `open → resolved` with a public reply.

If a trial week ends with 3 locations and 0 assets, they did not activate. The Welcome card currently **optimizes for schema completeness**, not A1.

### D.2 Indian buyer table (they will not skip this)

Enterprise / even a 200-person firm’s IT + Legal + Finance will ask ([SaaS contract checklist India](https://www.bhavyasharmaandassociates.com/saas-customer-contract-checklist-indian-startups-msa-dpa-sla-ip-payment-terms-2026/), [SaaS contracts 2026](https://globallawexperts.com/saas-contracts-india/), [vendor risk India](https://www.bachao.ai/blog/vendor-risk-management-third-party-assessment-india)):

- MSA + order form + **DPA** (customer = Data Fiduciary, you = Processor for employee PII).
- Hosting region, subprocessors (Render, Resend, Google Fonts CDN…).
- Breach notice aligned to **CERT-In / DPDP**.
- SOC 2 / ISO 27001 **or** a 4-page security note + last 12 months VAPT (acceptable at seed).
- GSTIN, SAC for SaaS, tax invoice; e-invoicing IRN when *your* turnover crosses the threshold ([ecosio India e-invoice](https://ecosio.com/en/compliance/india/e-invoicing/)).
- Data export + deletion on exit.

INR billing + GST invoice is why Indian teams pick Freshworks locally. USD-only Stripe checkout is a silent “no.”

### D.3 Pricing that people understand

Setyl: price by **company size**, unlimited assets, implementation included ([16 checks](https://setyl.com/blog/how-to-choose-it-asset-management-software)). Freshservice: **per agent** + **Asset Units** (confusing; [pricing](https://www.freshworks.com/freshservice/itam/pricing/)). Cheqroom: **per admin**, unlimited checkout users ([pricing](https://www.cheqroom.com/pricing/)). Hives AMS: **₹199/user/mo**.

**Recommendation for year 1:**

| Plan | Who | Meter | Includes |
|------|-----|--------|----------|
| Starter | ≤150 people, 1–2 IT | Flat INR / month | Assets, tickets, scan, import. No procurement. |
| Team | 150–800 people | Flat or per IT seat (max 10 seats billed) | + vendors/PO, contracts, chat |
| Care | Same + you import their Excel | Onboarding fee 1× | White-glove 5-day go-live |

Do **not** meter per laptop (punishes honesty). Do **not** hide price behind “talk to sales” for Starter — that is the opposite of easy approach. Team/Care can be sales-assist.

Public **14-day trial**, full Team features, sample *or* empty + import. Freshservice’s 14-day Enterprise trial is the pattern they already know.

---

## E. Functionality that makes clients approach and stay

Ranked for **company-building**, not completeness. Effort S/M/L.

### E.1 Productize the empty box (week 1–4) — **Need**

| # | What | Why clients approach | Size |
|---|------|----------------------|------|
| 1 | **Public marketing site** (not the app): 1 sentence, 3 screenshots (who-has-what, ticket, scan), price, “Import Excel”, GSTIN, India hosting note, WhatsApp/email | Nobody approaches a login form | S (Webflow/Framer) |
| 2 | **Self-serve signup** → tenant + Super Admin (today only `BOOTSTRAP_ADMIN_*` env) | Git clone is not a funnel | M |
| 3 | **Strip Softcom / demo password** from any client-facing login | Trust | S |
| 4 | **Welcome checklist of 5**, each a real action: (1) Import employees CSV (2) Import assets CSV (3) Assign one (4) Print/scan one QR (5) Raise + resolve a ticket. Hide procurement until step 5 | Activation A1+A2; PLG checklist research | M |
| 5 | **Sample company toggle**: “Load 25-laptop demo” vs empty. Never 1,250-row NewVision seed in a trial | They must see *their* names by day 2 | S |
| 6 | **Excel mapping on the welcome card** (drag `.xlsx`, map columns, 50-row preview) | Their register *is* Excel | M (import exists — surface it) |
| 7 | **Always-on trial** (no 15-min sleep) | Render Free kills the demo | Ops / paid instance |
| 8 | **Tenant name + logo + from-address** (`Acme IT`, not NewVision Softcom) | They will not send employee mail from your brand | M |

### E.2 Trust so Legal/IT does not bounce — **Need** (overlap `PRODUCT_GAPS`)

Without this you cannot invoice a serious client. Details live in the gaps report; here is the **sales** cut:

| # | What | Client question |
|---|------|-----------------|
| 9 | India region (Mumbai/Hyderabad cloud) **or** honest “Singapore demo only” | Data residency |
| 10 | Helmet, CSP, rate limit, no public Swagger, no JWT-in-localStorage long-term, MFA for Super Admin | Security pack |
| 11 | Login/audit events 180 days | CERT-In |
| 12 | One-pager: encryption, backups, subprocessors, DPDP roles, deletion SLA | Vendor questionnaire |
| 13 | DPA + MSA PDF on the site | Legal |
| 14 | GST tax invoice (Zoho Books is enough; you do not build IRN in the ITAM app) | Finance |
| 15 | Status page + backup restore test | “What if you die?” |

### E.3 Multi-tenant (the actual product company hinge) — **Need — L**

Without tenant_id (or DB-per-customer):

- You cannot let two companies sign up.
- A missed `WHERE` is a career-ending leak.

**Year-1 architecture (pick one, write it in DECISIONS):**

- **A. DB-per-tenant** (simplest isolation, ops-heavy). Fine for first 15 customers.
- **B. `tenantId` on every table** (real SaaS). Do this before customer 20.

Do not share one seed database and “filter in the UI.” Prompt 28 already proved UI hide ≠ API.

Signup creates tenant + Super Admin + empty locations template (India default states optional).

### E.4 The 15-minute sales demo (script = product work)

A client approaches if a **public demo** (or screen-share) hits their job:

1. Paste their 10-row sheet (or sample “Pune+Hyderabad”).
2. Assign a laptop; employee My IT shows it.
3. Scan the QR on a phone (audit stamp — still missing; `PRODUCT_GAPS` / `ITIS`).
4. Employee ticket “Outlook”; IT Support Assign-to-me + macro.
5. Warranty 30 days → attention row.
6. Offboard → laptop available.

If any step needs “ignore the seed Lenovo Apple Air” you lose. **Seed hygiene is a GTM feature.**

### E.5 Easy approach *channels* (not more UI chrome)

| Channel | Why India SMB | What to ship |
|---------|---------------|--------------|
| WhatsApp Business | IT Admin will not fill HubSpot | Number on site, 9–7 IST |
| INR pricing page | Freshworks lesson | Starter visible |
| YouTube 8-min “Excel → live” | They believe video more than copy | One recording of E.4 |
| Partner: local AMC / IT support shops | They already sit in the client’s office | 20% year-1 referral; **white-label later** |
| GST-registered entity | They cannot pay a hobbyist | Company + current account **before** plan Team |

Appcues-style in-app chat to *you* (Crisp/Tawk) on trial — not Teams replica.

### E.6 Product functionality that *sells* (narrow)

Only add product features that shorten A1 or win a bake-off vs Excel/Snipe:

| Feature | GTM job | Already? | Priority |
|---------|---------|----------|----------|
| CSV/XLSX import employees+assets | Steal Excel | Partial | **P0** surface + templates |
| QR scan **write** audit | Floor walk vs Snipe | Read-only public scan | **P0** |
| Employee portal (My IT + raise ticket) | Freshservice self-service 30–40% deflection claim | Have My IT | **P0** 12 how-tos (`ITIS`) |
| Warranty/AMC dates | Excel pain | Warranty yes; AMC claim thin | **P1** |
| Email-in live | “We already mail IT@” | Code, not live | **P0** ops |
| Offboard one shot | Lost-laptop horror story | Have; finish tickets | **P1** |
| GSTIN vendor master | India bake-off vs Snipe | `taxId` blob | **P1** (`VENDOR` file) |
| Print labels PDF | Snipe table stakes | Check if exists | **P1** |
| Mobile admin | Asset Panda pitch | Explicit non-goal | **Don’t**; scan page is enough |
| Intune/AD sync | Freshservice discovery | Deferred | Year 2 |
| Chat | “We have Teams” | Overbuilt | **Do not lead**; polish later |
| Procurement full P2P | Precoro | Have | Team plan only; hide on Starter |
| AI triage | Freshservice Freddy | Deferred | Not a year-1 differentiator in this ICP |

### E.7 Packaging inside the app (so Starter is not a maze)

Five roles × procurement × chat is **too much** for a 1-person IT shop (Siriusstar: one man, three sites, should not also patch Snipe).

**Starter nav:** Home, Assets, Employees, Tickets, Scan, Settings (import, users).  
**Team unlock:** Vendors, Maintenance, Reports extra, Chat.  
Settings flag `modules.procurement` / `modules.chat`.

This is how Freshservice/Setyl sell: you do not dump CMDB on day one.

---

## F. Company operating system (not in the Nest app)

Standing up the **company** (the legal/commercial entity) is parallel:

1. Private limited + GSTIN + current account.  
2. Founder MSA/DPA templates (lawyer, not GPT-paste of GDPR).  
3. Support hours IST, severity definitions (so SLA in the contract is honest — the app’s ticket SLA is first-response minutes, not 99.9% uptime).  
4. Backup + restore drill **documented**.  
5. One implementation playbook: Day 0 CSV templates, Day 1 import, Day 2 print QR, Day 3 employee comms (“raise tickets here”).  
6. Metrics: trial starts, A1 hit, paid conversion, logo (with permission).

Without (1)–(3), “client approach” dies in Finance.

---

## G. What will *not* make a company (avoid)

| Temptation | Why it feels like “upar le jao” | Why it does not |
|------------|----------------------------------|-----------------|
| Build ITIL problem/change/CMDB | Looks like ServiceNow | ICP will not implement it; 2–4 week Freshservice already owns that buyer |
| Perfect Teams clone | Impressive demo | They have Microsoft Teams; ITAM is the buy |
| Dark mode / mobile admin | Visual | Tablet + public scan is the decision |
| Marketplace of integrations year 1 | “Platform” | CSV + email-in covers 90% of 200-person IT |
| Custom fields builder | Every RFP | `FUTURE_IDEAS.md`; named columns instead |
| Free forever 250 assets | AssetTiger race | Attracts non-buyers; use 14-day full trial |
| Leading with chat screenshots | Unique | Unique ≠ valuable |

---

## H. 18-month path (if the goal is a company)

### Phase 0 — Sellable (6–8 weeks)

`PRODUCT_GAPS` production hardening + E.1 site/signup/welcome/import + E.2 trust one-pager + paid non-sleeping host + GST invoicing in Zoho. **Still single-tenant** is OK for **concierge**: you provision tenant by hand for 3 design partners.

**Success:** 3 companies (not friends) import a real sheet and hit A1.

### Phase 1 — Repeatable (quarter 2)

E.3 DB-per-tenant or `tenantId`. Self-serve Starter. Price page. Scan-to-audit. Employee how-tos. Live mail. Module flags.

**Success:** 10 paying Starter, one Care onboarding, NPS from IT Admin.

### Phase 2 — Differentiated India (quarter 3–4)

Vendor GSTIN/MSME (`VENDOR` file), OEM claim, mover, licence seats (`ITIS`). Partner kit for AMC firms. Optional India region.

**Success:** Bake-off win vs Snipe cloud on “GST + AMC + tickets.”

### Phase 3 — Do not do yet

Intune, AD, multi-entity, AppSource, white-label, SOC 2 (start the *process* at ~₹50L ARR, not before you have customers — but keep the security *note* from day 1).

---

## I. One-slide pitch (put on the website)

> **Stop losing laptops in Excel.** NewVision is IT asset inventory + a small helpdesk for Indian companies with a few offices. Import your sheet this afternoon. Employees raise tickets. IT sees who has what, warranty, and AMC. Hosted in the cloud, priced in rupees, GST invoice. Not ServiceNow.

That is how a client approaches. The functionality behind the sentence is **import, assign, ticket, scan, warranty** — which you mostly have — plus **a door, a price, and trust**.

---

## J. Sources

- [Amplitude-linked TTV / 7% day-7](https://www.digitalapplied.com/blog/customer-onboarding-time-to-value-2026-saas-metrics-framework)
- [B2B SaaS onboarding / checklist](https://cadence.withremote.ai/blog/b2b-saas-customer-onboarding)
- [PLG onboarding](https://productschool.com/blog/product-strategy/product-led-onboarding)
- [ITAM India SMB: Excel vs Snipe vs Freshservice vs AssetExplorer](https://siriusstar.in/it-asset-management-software-india/)
- [Freshservice India 2–4 week go-live, INR, GST](https://www.itforsme.in/solutions/freshservice-for-indian-companies)
- [Freshservice ITAM pricing / trial](https://www.freshworks.com/freshservice/itam/pricing/)
- [Setyl: how buyers choose](https://setyl.com/blog/how-to-choose-it-asset-management-software)
- [Hives AMS ₹199](https://hives.cloud/blog/microsoft-365-alternative-india-msme)
- [Excel vs AMS switch triggers](https://assetprime.org/asset-management-software-vs-excel)
- [India SaaS MSA/DPA/GST](https://www.bhavyasharmaandassociates.com/saas-customer-contract-checklist-indian-startups-msa-dpa-sla-ip-payment-terms-2026/)
- [DPDP processor vs fiduciary](https://globallawexperts.com/saas-contracts-india/)
- [Vendor questionnaires: SOC2 / VAPT](https://www.bachao.ai/blog/vendor-risk-management-third-party-assessment-india)
- In-repo: `login.tsx`, `FirstRunWelcome.tsx`, `render.yaml`, `README.md` demo accounts

---

## K. One-line recommendation

**To take this product “bahut upar” and stand up a company, stop adding suites and open a door:** a priced, trusted, multi-tenant hosted app whose first hour is “your Excel → who has what → a closed ticket.” Clients approach a GST invoice and a 15-minute demo, not a better chat theme.
