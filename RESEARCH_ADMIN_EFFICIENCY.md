# Research: What would make an IT Admin’s day easier

**Date:** 2026-09-11  
**Method:** Code + live API walk of the seeded estate as IT Admin / IT Support / Manager / Employee; cross-check against `PROJECT_STATUS.md`, `FUTURE_IDEAS.md`, `DECISIONS.md`, `PROJECT_DOCUMENTATION.md`; then comparable-tool and IT-operations research (Snipe-IT, GLPI, Freshservice, Zendesk, Jira Service Management, Spiceworks-class helpdesks, and published “day in the life” measurements).  
**Not in this pass:** application code changes. Browser click-through was limited (no browser tooling); the “day” below is grounded in **real live API data** plus the screens those endpoints feed.

**Live snapshot used (IT Admin `itadmin@newvision.local`):** 1,250 assets (746 assigned, 247 available, 93 under repair, 71 warranty-expiring in the 90-day metric); Needs attention = 8 warranties ≤7d, 10 stale repairs, 2 low-stock; 3 support tickets in the queue (1 overdue, 0 unassigned); 247 available assets ready to issue; 0 pending hardware requests; staff chat unread = 0; two checklist templates exist (Laptop onboarding, Contractor offboarding).

---

## A. A realistic day in the life (today, in NewVision)

Ishan is IT Admin for Pune / Hyderabad / Bhopal. Sunil is IT Support. The estate is already large; the helpdesk queue on this seed is *small* (three tickets). That is useful: it shows that **inventory toil, not ticket volume, is the heavier daily load** in this product as it stands.

### 08:00 — Open the tool, decide what matters

Ishan lands on **Dashboard** (`EstateDashboard` in `frontend/src/pages/dashboard.tsx`). He sees six KPI tiles (Total / Assigned / Available / Under Repair / Retired / Open tickets) and a Support tickets widget (Today / Yesterday / Tomorrow / range). Warranty is no longer a primary KPI — it sits in **Needs attention** with stale repairs, low stock, and requests to fulfill.

**Friction today**

- The estate home answers “how big is the inventory?” well. It does **not** answer “what should I do in the next 30 minutes?” as a single ordered work list. Attention items are a mixed pile (8 warranty + 10 stale repairs + 2 low stock), capped and dismissible as a group (`Dismiss all`), not owned or sequenced.
- Ticket KPI “Open” / “Created in window” still deep-link to `/tickets` without a date filter. Unassigned / In progress / Resolved do apply Refine filters.
- Sunil’s **Queue** home (`SupportHome`) is closer to a workday: Unassigned, My tickets, Maintenance, stale repairs. Ishan (IT Admin) does **not** get that queue home — he gets the inventory console. So the person who also assigns laptops and offboards people starts the day in a different mental model than the person who only works tickets.
- IT Support has **no Settings nav**, so Immediate vs Daily digest and Helpdesk mailbox status are easy to miss (digest UI lives under Settings → Account).

### 08:15 — Triage the ticket queue

Ishan opens **Support Tickets**. Quick views exist (All / My tickets / Unassigned / Overdue / Awaiting my reply / Email-in) plus status chips, saved views, bulk assign/close, CSV/PDF, and a mail-icon “copy email draft.”

On the live list there are three tickets, all from Kabir Sharma: a resolved shared-drive access, an assigned printer issue, an in-progress Outlook search. One is overdue.

**Friction today**

- The grid columns are Ticket / Subject / Status / Priority / Category / Updated. **Assignee and requester are not on the list.** To see “who has this?” Ishan must open the show page. That is extra navigation on every triage pass.
- There is **no “Assign to me”** (confirmed: no such control in ticket list or show). Assignment is a dropdown of staff on the show page. Zendesk/JSM treat `i` / `a` (assign to me) as a first-class queue action.
- There is **no “next ticket” / guided mode**. JSM queues use `J`/`K`/`O` to walk the queue without the mouse ([Atlassian: keyboard shortcuts in queues](https://support.atlassian.com/jira-service-management-cloud/docs/use-keyboard-shortcuts-in-your-queues/)). NewVision’s keyboard hints are strongest on Assets/Employees DataGrid (`/` , arrows, Ctrl+C); `?` goes to Help, not a shortcut cheatsheet. Tickets inherit table keyboard only if focus is in the grid.
- Opening `TCK-000035` (status `in_progress`, assigned to Sunil) still returns a timeline event **“Not started”** because `timeline()` only treats an *audit log* assign/`in_progress` as “Work started.” Seeded or email-created tickets that already have a status can lie. An agent who trusts History will think nobody has touched it.
- Canned replies exist (e.g. “Network team”) and insert body text only. They do **not** also set status, assignee, or `waiting_on_employee` the way Zendesk **macros** do ([Zendesk macros](https://support.zendesk.com/hc/en-us/articles/4408844187034-Creating-macros-for-repetitive-ticket-responses-and-actions)).
- Copy-email is already there for Outlook paste — that part of the hallway-to-mailbox loop is solved. Staff chat exists for IT-only DMs. Employees still cannot see Chat (by design).
- No **agent collision** (Freshservice/Zendesk: who is viewing / who is typing). With two staff on a three-ticket queue this is mild; on a busy Monday it causes double replies.

### 08:45 — A new hire (or a “please issue a laptop”) 

247 assets are `available`. The supported path is: Employees → profile → **Assign** (`AssignToEmployeeModal`) *or* Assets → open an available row → Assign modal (employee + optional accessories). Checklists live on the same profile (start onboard from template “Laptop onboarding”: issue laptop, create login, VPN/MFA, badge). Create-login is a checkbox on **Add employee**, not on the checklist.

**Friction today**

- Onboarding is **four separate actions** that a human must remember: create/find employee → optional login → start checklist → assign a specific available asset (and maybe accessories) → maybe raise/close a ticket. Setyl/Cheqroom/Oomnitza sell this as one “new hire kit” because IT loses time stitching those steps ([Setyl onboarding](https://setyl.com/), [Cheqroom deploy kits](https://www.cheqroom.com/solutions/it-asset-management/)).
- Searching “Kabir” as IT Admin returned **33 employees**. The app now shows `Name · EMP-code` in many pickers — that helps — but the ticket requester is still easy to confuse without code on the **ticket list**.
- There is no “standard laptop kit” (laptop + charger + mouse) as a single checkout. Snipe-IT’s predefined kits exist specifically to shorten checkout ([Snipe-IT product features](https://snipeitapp.com/product)). NewVision can attach accessory IDs on assign, but the admin must tick them every time.
- Incomplete checklists do **not** appear on the dashboard. After lunch, Ishan has no “3 onboardings still open” reminder.

### 10:00 — Repairs and warranties (the quiet time-eaters)

93 assets are under repair. Attention lists 10 **stale** repairs (≥14 days). The warranty-expiring API with `withinDays=30` returned **500 rows**, many already expired by **1,200+ days** (e.g. `AST-HYD-LAP-0081`, −1235 days). The 90-day KPI count is 71; the ≤7-day attention list is 8.

**Friction today**

- Warranty work is split: a small attention strip, a 90-day metric on `/dashboard/metrics` that is **no longer a KPI tile**, a `GET /dashboard/warranty-expiring` dump that mixes ancient expired kit with “renew this quarter,” and a Reports → Warranty **download**. There is no “this week’s renewals” work queue with owner and next action.
- Stale repairs are links to `/maintenance`, not to a filtered “open >14 days” view Ishan can work down. Maintenance is a separate module from Support Tickets — a printer ticket and a laptop under_repair can be two records for one physical event.
- Snipe-IT’s comparable daily habit is **audit due / expected check-in** lists with sidebar badges ([Snipe-IT email alerts](https://snipe-it.readme.io/docs/email-alerts), [audit due API](https://snipe-it.readme.io/reference/hardwareauditdue)). NewVision has **no `lastAuditAt` / `nextAuditAt` / `expectedCheckin`** in Prisma. QR scan is a public status card, not “I stood in front of this asset today.”

### 11:30 — Walk-up / hallway / email (context switching)

A Habr write-up of a real admin who logged every request for a month (100-person office, 421 episodes, ~1.8 interruptions per day, lots of <5 minute tasks) is the best description of Ishan’s hidden load: the day feels full, but infrastructure work never starts ([Habr: Where a system administrator’s day actually goes](https://habr.com/en/articles/1063390/)). NewVision already pulls hallway work *into* tickets (portal + email-in + copy-email-to-Outlook). That is the right direction.

**Friction today**

- Email-in is implemented (IMAP poll + webhook + ingest) but locally **unproven** without `IMAP_HOST`. If people still WhatsApp Ishan, the ticket is created only if someone types it. Staff chat does not include Managers/Employees (intentional).
- Copy-email helps Ishan answer from Outlook without fighting SMTP. It does not log that paste as a public comment unless he also comments in-app — two places to stay in sync.
- Command palette (⌘K) is fast for jumping to `TCK-` / `AST-` / employees, but **static actions are not role-filtered** (an Employee can see “New asset” / “Audit Log” in the list). Extra noise, extra mis-clicks.

### 14:00 — Offboarding / contractor end date

Offboard is a real one-shot API (`POST /employees/:id/offboard`): return or reassign assets, check in accessories, deactivate login. Contract employees have `employmentType` + `contractEndDate` and list filters (Active/Inactive × Permanent/Contract).

**Friction today**

- There is **no “contracts ending this month”** attention row. Ishan must remember to filter Employees.
- Offboard checklist and the destructive offboard action are siblings on the profile — easy to tick boxes and forget to actually run Offboard, or the reverse.
- No loaner / expected-return date on assignment (Snipe-IT expected check-in alerts). A “spare laptop until Friday” becomes a permanently assigned asset.

### 16:30 — Inventory honesty and management numbers

Reports are five download cards (assets, employees, locations, warranty, supplies). Dashboard location table already answers “how many in HYD are under repair?” without a PDF.

**Friction today**

- Physical audit still means walking with a phone to `/scan/:code` and mentally ticking a spreadsheet. Snipe-IT bulk audit is “type/scan tag, stamp last audit, schedule next” ([Snipe-IT labels + scanners](https://snipe-it.readme.io/docs/asset-labels)).
- HR reconciliation is a **manual CSV upload** in Settings (deliberate: no live AD/HR sync). That is correct scope, but Ishan only does it when someone nags — there is no calendar nudge.
- Bulk asset actions are status / transfer / retire — **not** “checkout these 5 available laptops to this new team.” Snipe-IT added bulk checkout for exactly that Monday-morning pattern ([Snipe-IT PR #15680](https://github.com/snipe/snipe-it/pull/15680)).

### 17:30 — Handoff

Sunil still has two tickets (printer, Outlook). Chat `#it-ops` can hold the verbal handoff, but there is no “tomorrow, Sunil” due filter on the ticket widget that writes a *personal* queue. Tomorrow-due on the dashboard is estate-wide `dueDate`, and today’s seed showed `due=0`.

---

## B. Concrete opportunities

Already built (do not rebuild): asset lifecycle + assign/transfer/retire, bulk status/transfer/retire, employee offboard, accessories/consumables, requests (employee → manager → IT), maintenance tickets, support tickets (comments, watchers, canned, templates, CSAT, bulk assign/close, saved views, email-in code, copy-email, @mentions, timeline), role-scoped homes, command palette, QR scan, warranty cron 90/60/30, reports CSV/PDF, staff chat, onboard/offboard **templates**, name+code labels, dashboard ticket summary.

### Reduce repetitive manual work

#### 1. Ticket macros (canned reply + status + optional waiting_on_employee)

- **What:** From ticket show, one control: “Need info from user” → insert canned body, set `waiting_on_employee`, keep assignee. “Resolved — standard close” → public reply + resolved. Extend existing canned responses rather than a rules engine.
- **Why:** Zendesk macros exist because agents repeat the same *bundle* of actions, not just the same paragraph. NewVision canned text still leaves three clicks (status, waiting clock, send). The Habr log showed 172 sub-5-minute requests — those are exactly macro-shaped.
- **Where:** Settings → Helpdesk canned rows + ticket composer.
- **Size:** Small–medium.
- **Source:** Zendesk macros; NewVision composer already has canned insert.

#### 2. “Assign to me” on the ticket list and show header

- **What:** One button / `i` shortcut that `POST`s assign with the current user and optionally sets `in_progress`.
- **Why:** Opening a dropdown of all staff to pick yourself is the most common assign. JSM documents assign-to-me as a queue shortcut.
- **Where:** `tickets/list.tsx` row actions + `tickets/show.tsx` header.
- **Size:** Small.
- **Source:** JSM/Zendesk agent workspace; observed missing control in current UI.

#### 3. New-hire / role kit (one checkout)

- **What:** Named kit (e.g. “Pune laptop standard”) = category or model preference + default accessories. From employee profile: “Issue kit” picks the next available matching asset and checks out the accessories in the same call already supported by `accessoryIds[]` on assign.
- **Why:** Snipe-IT kits and Cheqroom deploy kits exist because issuing “laptop + charger + mouse” is daily and error-prone when ticked by hand. 247 available assets makes “which spare?” a search problem.
- **Where:** Settings (kit definition) + employee profile / assign modal.
- **Size:** Medium.
- **Source:** Snipe-IT predefined kits; NewVision assign already accepts accessory IDs.

#### 4. Bulk assign / checkout from the Assets list

- **What:** Selected available rows → pick one employee (or one kit) → assign. Per-row best-effort, same as existing bulk retire.
- **Why:** New team, training room, or contractor batch. Snipe-IT added this to the bulk toolbar because list → open → assign × N is the painful path ([PR #15680](https://github.com/snipe/snipe-it/pull/15680)). NewVision bulk today is status/transfer/retire only.
- **Where:** `assets/list.tsx` `bulkActions`.
- **Size:** Small–medium (API may already loop assign).
- **Source:** Snipe-IT; NewVision list friction.

#### 5. Canned ticket *templates* at create time with placeholders

- **What:** Ticket templates already exist in the product; make “New printer issue” / “New joiner kit” pre-fill category, priority, and a checklist-like description, including `{{employee}}` / `{{asset}}` if linked.
- **Why:** Cuts triage classification time (MSP research: 3–8 minutes per ticket on classify + context — [Mizo triage guide](https://mizo.tech/blog/ticket-triaging-practical-guide-msp/)).
- **Where:** Tickets → create + Settings → Helpdesk.
- **Size:** Small if templates are already wired; medium if create form ignores them.
- **Source:** GLPI ticket templates; Spiceworks-style helpdesk research already in-repo.

### Surface what needs attention proactively

#### 6. A single “My work” strip for IT Admin *and* IT Support

- **What:** Ordered list, not mixed cards: (1) my overdue tickets, (2) unassigned, (3) waiting_on_employee older than N days, (4) stale repairs assigned to nobody, (5) incomplete checklists, (6) contracts ending in 14 days, (7) warranties in the next 14 days only. Each row is an action (open / assign to me). Keep the estate KPI row for IT Admin underneath.
- **Why:** Techmonarch’s helpdesk day starts with overnight + carry-over + SLA, not inventory totals ([Day in the life of a helpdesk](https://techmonarch.com/blog/a-day-in-the-life-of-our-helpdesk-how-we-solve-50-issues-a-day/)). Ishan’s current home is inventory-first; Sunil’s is closer but omits checklists, contracts, and warranties.
- **Where:** Dashboard — reuse `GET /dashboard/attention` and extend it. Do not add a sixth sidebar item.
- **Size:** Medium.
- **Source:** Observed dashboard vs Support home split; general “queue first” helpdesk practice.

#### 7. Warranty work queue (upcoming vs already dead)

- **What:** Two tabs or filters: **Expired (still in field)** vs **Expiring in 14/30/90 days**. Hide −1000-day seed wreckage behind “Expired.” Click-through from attention should use the same filter, not `warranty-expiring`’s 500-row dump.
- **Why:** Live API returned 500 rows with −1235 days first. Nobody plans renewals from that. Snipe-IT’s expiring-alerts threshold is “start warning N days before,” not “sort all historical expiry” ([Snipe-IT notifications](https://snipe-it.readme.io/docs/notifications)).
- **Where:** Dashboard attention + Reports/warranty or a filtered Assets saved view.
- **Size:** Small.
- **Source:** Live API walk; Snipe-IT alert thresholds.

#### 8. Contracts ending + incomplete checklists on attention

- **What:** Cheap queries: `employmentType=contract AND contractEndDate <= today+14 AND isActive`; employee checklists with any `done=false`. Show counts on Employees and Dashboard.
- **Why:** Offboarding research (SIIT / lifecycle vendors) treats missed recovery as a **security** miss, not a tidy-up. The templates exist; they are invisible once you leave the profile.
- **Where:** `dashboard.controller.ts` `attention` + employee list badge.
- **Size:** Small.
- **Source:** NewVision gap vs own checklist feature; ITAM offboarding practice (Setyl/Oomnitza — workflow itself stays out of scope).

#### 9. Personal “due tomorrow” for the logged-in agent

- **What:** Ticket widget already has Tomorrow (estate `dueDate`). Add **My due** using `assignedToId = me`.
- **Why:** Estate `due=0` today hid the feature; when due dates are used, Ishan still does not see *his* day.
- **Where:** Dashboard ticket widget + tickets `view=mine&due=tomorrow`.
- **Size:** Small.
- **Source:** NewVision widget as built; JSM personal queues.

### Speed up common daily flows

#### 10. Ticket list columns that match how agents scan

- **What:** Show **Requester (Name · EMP-code)**, **Assignee**, and **Age / SLA** on the default list. Keep subject. Persist via existing DataGrid column prefs.
- **Why:** Live triage required opening each ticket to see Sunil vs Ishan. That is wasted motion on a 50-ticket Monday (internal helpdesks are often 5–20 tickets/day; MSPs 50+ — same column need).
- **Where:** `tickets/list.tsx` columns (data is already on the list payload — show page has `assignedTo` / `raisedBy`).
- **Size:** Small.
- **Source:** Observed list; Freshservice/Zendesk queue tables always show requester + agent.

#### 11. Queue keyboard: next / previous / open / assign-to-me

- **What:** On `/tickets` with a focused row: `J`/`K` move, `Enter` open, `I` assign to me. Document on a `?` overlay **when not navigating to Help** (today `?` is Help globally — conflict; use `Shift+/` for shortcuts like Jira).
- **Why:** PROJECT_STATUS already admits keyboard is weakest outside assets/employees. JSM built queue shortcuts for this reason.
- **Where:** Ticket list + optional show “Next in view.”
- **Size:** Small.
- **Source:** [JSM queue shortcuts](https://support.atlassian.com/jira-service-management-cloud/docs/use-keyboard-shortcuts-in-your-queues/); in-repo known gap.

#### 12. Honest ticket timeline (“Work started” from current status)

- **What:** If status is already `assigned` / `in_progress` / `waiting_on_employee`, do not emit **Not started**. Treat current state as started even without an audit row (or write the audit on seed/transition).
- **Why:** Live `TCK-000035` is `in_progress` and still “Not started.” Agents will mistrust History and stop using it.
- **Where:** `tickets.service.ts` `timeline()`.
- **Size:** Small.
- **Source:** Live ticket 35; Prompt 20 timeline requirement.

#### 13. Onboarding “runbook” on the employee profile (one column)

- **What:** A single card: checklist progress, linked available-asset picker, “create login if missing,” default kit. Not a workflow engine — a guided checklist that calls existing endpoints in order.
- **Why:** The Habr admin’s biggest win on onboarding was a **reusable template** that bundled account + MFA + checklist. NewVision split those across Add employee, Settings templates, and Assign.
- **Where:** Employee profile (IT Admin).
- **Size:** Medium.
- **Source:** Habr onboarding template; NewVision’s own split UI.

#### 14. Physical audit stamp (last seen)

- **What:** Authenticated action on `/scan/:code` or a staff “Audit” on asset show: set `lastAuditedAt`, optional location confirm, optional note. List filter “Not audited in 12 months.” Optional next-due = last + interval (Snipe-IT audit interval).
- **Why:** 1,250 assets across three sites will drift without a cadence. QR today is read-only PII-safe status — good for a passer-by, useless as an inventory campaign. Snipe-IT bulk audit + due badges are the standard lightweight pattern.
- **Where:** New fields on `Asset` + scan/asset show + dashboard attention.
- **Size:** Medium.
- **Source:** Snipe-IT upcoming audits; NewVision QR without a write-back.

#### 15. Loaner / expected return date on assign

- **What:** Optional `expectedReturnAt` on assignment. Attention: overdue loaners. Does not auto-check-in.
- **Why:** Snipe-IT expected-checkin alerts exist because “temporary” assignments become permanent in every estate.
- **Where:** Assign modal + attention.
- **Size:** Small–medium (schema + one query).
- **Source:** [Snipe-IT expected check-in](https://snipe-it.readme.io/docs/email-alerts).

### Reduce context-switching

#### 16. Light agent collision (who’s on this ticket)

- **What:** While ticket show is open, heartbeat every 10s (`POST /support-tickets/:id/presence`). Show avatars “Sunil is viewing.” No WebSocket required (same as chat poll). Not Slack.
- **Why:** Freshservice documents collision specifically to stop two agents sending the same public reply ([Freshservice agent collision](https://support.freshservice.com/support/solutions/articles/50000000941-detecting-agent-collision-in-tickets)). NewVision already has watchers (static) and chat (separate).
- **Where:** Ticket show header.
- **Size:** Medium.
- **Source:** Freshservice/Zendesk; two-staff seed already shares Kabir’s tickets.

#### 17. “Log this Outlook paste as a public comment” checkbox

- **What:** After Copy email, optional “also add this draft as a public comment.” One extra click, stays in-app.
- **Why:** Otherwise Ishan’s mailbox and the ticket thread diverge — the Habr problem of the same episode arriving on two channels.
- **Where:** `CopyEmailButton`.
- **Size:** Small.
- **Source:** NewVision copy-email vs comment being separate; channel-fragmentation research.

#### 18. Role-filter the command palette + IT Support can open Account

- **What:** Hide “New asset” / Audit / Settings from roles that cannot use them. Put **Account / digest** in Support’s header or Queue home so they do not need Settings.
- **Why:** ⌘K is the global jump; wrong actions cause 403s and lost seconds. Support is the role that needs digest most and cannot see Settings in `navForRole`.
- **Where:** `CommandPalette.tsx`, `access.ts`, Support home.
- **Size:** Small.
- **Source:** Observed nav vs Settings; palette static list.

#### 19. Link maintenance ↔ support ticket when they are the same incident

- **What:** Optional `supportTicketId` on a maintenance row (or vice versa) and a “Open repair” link on the ticket when an asset is `under_repair`.
- **Why:** 93 under_repair + a printer ticket can be two queues for one laptop. Agents context-switch modules. Not a CMDB — a single optional FK.
- **Where:** Ticket show + maintenance.
- **Size:** Medium.
- **Source:** Live 93 repairs + ticket module split; Spiceworks-era “one place” complaint.

### Small quality-of-life

#### 20. Default ticket create: category default priority already exists — remember last category / last view

- **What:** Persist last ticket list view and last create-category in `localStorage` (same pattern as DataGrid prefs).
- **Why:** Agents live in “Unassigned” or “Mine”; returning to All every time is a click tax.
- **Where:** `tickets/list.tsx`, `tickets/create.tsx`.
- **Size:** Small.
- **Source:** Zendesk custom views / JSM queues; NewVision saved views exist but are opt-in each session.

#### 21. Employee picker: prefer exact employee code, show “33 matches” when the name is Kabir

- **What:** If `q` looks like `EMP-…`, jump to one row. If many names match, show count and require code.
- **Why:** Live search `Kabir` → 33 people. Mis-assign is an expensive error.
- **Where:** `EmployeeSelect` + employees `q`.
- **Size:** Small.
- **Source:** Live API walk.

#### 22. Stale-repair deep link with a real filter

- **What:** Attention “stale” → `/maintenance?filters…` for `under_repair` + `reportedAt <= now-14d`, not the unfiltered module.
- **Why:** 10 stale items currently dump Ishan onto a full maintenance list.
- **Where:** `dashboard.controller.ts` `href` + maintenance list `syncWithLocation`.
- **Size:** Small.
- **Source:** Live attention payloads (`href: '/maintenance'`).

#### 23. Simple recurring *operational* ticket (optional, keep tiny)

- **What:** One Settings row: “Create this ticket every Monday” from an existing ticket template (title, category, assignee). No calendars-of-calendars, no SLA engine.
- **Why:** GLPI recurring tickets exist so quarterly access reviews and Monday backup checks are not tribal memory ([GLPI recurring tickets](https://help.glpi-project.org/documentation/modules/assistance/recurrentticket)). Useful at 3 sites; easy to over-build — cap at “template + cron + assignee.”
- **Where:** Settings → Helpdesk.
- **Size:** Medium.
- **Source:** GLPI; acknowledge proximity to `FUTURE_IDEAS.md` routing/SLA — this is **scheduled create**, not a rules engine.

#### 24. Shortcut overlay that does not steal `?` from Help

- **What:** `Shift+/` opens “On this page: / search, J/K tickets, I assign to me.” Keep `?` → Help as today.
- **Why:** Status doc already says shortcuts are uneven. Teaching them in Help articles is not the same as a cheatsheet at the point of work (Jira `?` dialog).
- **Where:** Header.
- **Size:** Small.
- **Source:** Jira shortcuts dialog; PROJECT_STATUS leftover.

---

## C. Explicitly out of scope / already considered

These showed up in research and vendor marketing. They conflict with current scope (`PROJECT_STATUS.md` §8, `FUTURE_IDEAS.md`). **Interesting, not recommended as next work.**

| Tempting idea | Why we are not recommending it now |
|---|---|
| AI triage / auto-categorize / chatbot | Explicitly in `FUTURE_IDEAS.md`. MSP triage stats are real, but NewVision’s live queue is 3 tickets; inventory toil is larger. |
| Full SLA / OLA engine, business hours, escalation | `FUTURE_IDEAS.md` (“overdue is visual only”). First-response pause on `waiting_on_employee` is enough. |
| Configurable routing-rules builder | Same file. Macros (human-applied) are the scoped substitute. |
| Live AD / Entra / HR sync, JML automation | Excluded. Keep manual reconciliation + checklist. A “contracts ending” *nudge* is in-scope; sync is not. |
| CMDB / dependency graphs / service catalog | Excluded. Optional maintenance↔ticket link is the farthest we should go. |
| Slack / Teams / SMS ingestion, multi-mailbox | `FUTURE_IDEAS.md`. One mailbox email-in + staff chat is the line. |
| ServiceNow-style lifecycle workflows, procurement, licenses, MDM | Vendor research (Oomnitza, AssetSonar, Setyl) — wrong product size. |
| Dark mode, phone-width admin app | Explicit non-goals. Scan page stays phone-first. |
| Redis/Bull, custom fields builder, merge/split, CSAT nag mail, i18n | `FUTURE_IDEAS.md`. |
| Gamified leaderboards | Excluded; Freshdesk-style points do not help a 2-person IT staff. |

---

## D. Top recommendations (what I would do first)

1. **Ticket list: requester, assignee, SLA + Assign to me** — Daily triage is currently blind; this is the highest clicks-per-hour win. Small.
2. **Fix “Not started” on already-active tickets** — History that lies trains people to ignore it. Small.
3. **Warranty queue: upcoming vs expired** — Live data is unusable as a work list (500 rows, −1200 days). Small.
4. **Extend Needs attention into a real “My work” list** (my overdue, unassigned, stale repairs with filters, incomplete checklists, contracts ending). This is the morning ritual the estate dashboard is missing. Medium.
5. **Employee “Issue kit” + optional bulk assign** — Matches how hardware actually goes out; Snipe-IT already standardized it. Medium.
6. **Physical audit stamp on scan/show** — The only scalable way to trust 1,250 assets across three offices without a spreadsheet. Medium.
7. **Canned → macro (status + waiting_on_employee)** — Turns 5-minute tickets into one control. Small–medium.
8. **Queue keyboard (J/K/Enter/I) + Shift+/ cheatsheet** — Documented gap; JSM’s whole agent UX is this. Small.
9. **Role-filter palette + digest on Support home** — Stops 403s and lets the people on the queue control email noise. Small.
10. **Loaner expected-return date** — Stops “temporary” laptops vanishing into Assigned. Small–medium.

If only three ship: **1, 4, and 5**. They match the actual day: scan the queue, see what is on fire, issue hardware without a scavenger hunt.

---

## Research notes (sources)

- Live NewVision API, 2026-09-11, roles IT Admin / IT Support / Manager / Employee; files cited above.
- [Habr — I Logged Every Coworker Request for a Month](https://habr.com/en/articles/1063390/) — interruptions, sub-5-minute work, onboarding template, waiting-on-user vs waiting-on-vendor.
- [Mizo — Ticket triaging for service desks](https://mizo.tech/blog/ticket-triaging-practical-guide-msp/) — 3–8 min classify cost (use as qualitative, MSP-scale).
- [Techmonarch — Day in the life of a helpdesk](https://techmonarch.com/blog/a-day-in-the-life-of-our-helpdesk-how-we-solve-50-issues-a-day/) — morning carry-over / SLA / overnight.
- [Snipe-IT product + alerts + labels + bulk checkout PRs](https://snipeitapp.com/product) — kits, audit due, expected check-in, scanner-oriented labels.
- [GLPI recurring tickets](https://help.glpi-project.org/documentation/modules/assistance/recurrentticket) — scheduled operational work.
- [Zendesk macros](https://support.zendesk.com/hc/en-us/articles/4408844187034-Creating-macros-for-repetitive-ticket-responses-and-actions), [Freshservice agent collision](https://support.freshservice.com/support/solutions/articles/50000000941-detecting-agent-collision-in-tickets), [JSM queue shortcuts](https://support.atlassian.com/jira-service-management-cloud/docs/use-keyboard-shortcuts-in-your-queues/).
- ITAM marketing (Setyl, Cheqroom, Oomnitza, AssetSonar) used only to confirm **onboarding kit / offboarding recovery / warranty cadence** as industry defaults — not as a prompt to copy their integration graphs.
