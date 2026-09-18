import { employeeHowtos } from './employeeHowtos';

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  /** Optional second nav level within a category (e.g. "Lifecycle", "For IT staff"). */
  group?: string;
  summary: string;
  keywords: string[];
  screenshot?: string;
  callouts?: { n: number; label: string }[];
  body: string;
}

export const HELP_CATEGORIES = [
  'For employees',
  'Getting Started',
  'Assets',
  'Employees',
  'Locations & Departments',
  'Accessories & Consumables',
  'Maintenance',
  'Support tickets',
  'Team Chat',
  'Requests',
  'Procurement',
  'Reports & Analytics',
  'Import & Reconciliation',
  'Notifications',
  'Settings',
  'Reference',
  'Tips & Troubleshooting',
] as const;

export const helpArticles: HelpArticle[] = [
  ...employeeHowtos,
  {
    id: 'getting-started',
    title: 'Getting Started',
    category: 'Getting Started',
    summary: 'First login, roles, and initial setup for a new IT admin.',
    keywords: ['login', 'roles', 'setup', 'password', 'onboarding'],
    screenshot: '/docs/screenshots/login.png',
    callouts: [
      { n: 1, label: 'Work email' },
      { n: 2, label: 'Password' },
      { n: 3, label: 'Sign in' },
    ],
    body: `## Welcome to NewVision

NewVision is the internal IT inventory, helpdesk, staff chat, and procurement system for ~1,250 assets across Pune, Hyderabad, and Bhopal. Sign in with your work email. There is no public self-service signup.

### Demo logins

All seeded demo accounts use password **Password123!**:

| Role | Email | Typical use |
|------|-------|-------------|
| Super Admin | superadmin@newvision.local | Full access including **Settings → Users** |
| IT Admin | itadmin@newvision.local | Day-to-day estate, helpdesk, procurement |
| IT Support | support@newvision.local | Tickets, repairs, staff chat |
| Manager | manager@newvision.local | Team requests, tickets, and requisitions |
| Employee | employee@newvision.local | **My IT** — own devices, tickets, requests |

### Roles at a glance

Five roles. The API enforces every permission; hiding a button is not the security boundary.

- **Super Admin** — everything, including creating logins and other Super Admins.
- **IT Admin** — everything except **Users** and hard-deleting assets.
- **IT Support** — tickets, maintenance, read-only estate, reports (not vendor spend), staff chat. No procurement, import, or user admin.
- **Manager** — own + direct-report people, assets, tickets, requests, and requisitions. Approves team requests.
- **Employee** — own assigned kit, raise a ticket or a device request, report a repair on an assigned asset.

See [Roles & Permissions](/help/roles) for the full table.

### First steps for a new admin

**Empty database (migrate only, no demo seed):** the Dashboard shows a **Welcome to NewVision** card with four setup steps — locations, categories, employees, then assets. That card is hidden once any of those exist.

**First Super Admin on a blank production database:** set \`SEED_MODE=bootstrap\` with \`BOOTSTRAP_ADMIN_EMAIL\`, \`BOOTSTRAP_ADMIN_PASSWORD\` (12+ characters), and optional \`BOOTSTRAP_ADMIN_NAME\`. That creates the five roles plus one Super Admin and **does not** load the 1,250-asset demo. \`SEED_IF_EMPTY=true\` still skips once any user exists.

**Seeded demo:**

1. **Locations** — confirm Pune (\`PUN\`), Hyderabad (\`HYD\`), Bhopal (\`BHO\`) under **Locations**.
2. **Categories** — **Settings → Categories** (LAP, MON, DES, …). Seeded databases already have these.
3. **Employees** — add people, or **Settings → Import jobs**. Tick **Create login** when you add someone who should sign in.
4. **Assets** — create one, or import. Then **Assign** from an available row.
5. **Helpdesk** — **Settings → Helpdesk** for canned replies. Outbound mail needs \`SMTP_HOST\` or \`RESEND_API_KEY\`; inbound mail needs IMAP env vars.
6. **Issue kits** — **Settings → Issue kits** if you hand a standard laptop + charger bundle to new hires.

Press **/** on a list to focus that grid's filter. Press **⌘K** / **Ctrl+K** anywhere to jump.

> [!TIP]
> Press **⌘K** / **Ctrl+K** to open the command palette from anywhere in the app — it jumps straight to a screen or a record by typing its code (e.g. \`TCK-000123\`). **?** opens this Help. **Ctrl+/** opens the shortcuts overlay.

### Troubleshooting

**I cannot see Dashboard / Settings / Chat.**
Your role decides the home and the sidebar. Employees land on **My IT**. Managers land on team work. IT Support lands on an operational queue. Chat is Super Admin / IT Admin / IT Support only.

**Forgot password does nothing.**
The reset flow exists. Without SMTP / Resend, the reset token is written to the **backend console**, not an inbox.

**The Welcome card is gone.**
It only shows on a truly empty estate (no locations, employees, or assets).`,
  },
  {
    id: 'my-it',
    title: 'My IT (employees)',
    category: 'Getting Started',
    summary: 'What employees see on Home, My devices, tickets, and requests.',
    keywords: ['my it', 'employee', 'self service', 'home', 'devices'],
    screenshot: '/docs/screenshots/my-it.png',
    callouts: [
      { n: 1, label: 'Assigned devices' },
      { n: 2, label: 'Raise a ticket' },
      { n: 3, label: 'Request a device' },
      { n: 4, label: 'Open tickets' },
    ],
    body: `Employees do not see the estate console. After sign-in you land on **My IT**.

### What you can do

1. **Home** — your assigned devices (with a copy chip on the asset code), **Raise a ticket**, **Request a device**, and your open tickets.
2. **My devices** — the same assigned kit as a list. You cannot assign, transfer, or retire anything.
3. **My tickets** — raise and follow tickets you opened. You see public comments only, never internal IT notes.
4. **Raise a request** — ask for a laptop, monitor, or accessory. Your manager approves; IT fulfills.
5. **Profile** — your directory record. You can update **phone** and **job title**; name, email, location, and department stay with IT.

### What you cannot do

Inventory lists (Accessories / Consumables stock), Reports, Audit Log, Settings, Vendors, Chat, and other people's tickets or assets.

> [!NOTE]
> If a laptop still shows as assigned after you handed it in, IT has not run **Return** / **Transfer** yet. Offboarding a person does **not** automatically free their kit.

### Troubleshooting

**I do not see a device that is on my desk.**
It is not assigned to your employee record yet. Ask IT to Assign it — scanning the QR sticker will not claim it for you.

**Raise a ticket vs Request a device vs Maintenance.**
Software / access / VPN = ticket. "I need a new laptop" = request. "This specific laptop is broken" = report a repair on that asset (Maintenance).`,
  },
  {
    id: 'dashboard',
    title: 'Dashboard & Analytics',
    category: 'Reports & Analytics',
    summary:
      'Role-specific homes, KPI tiles, status and location tables, ticket summary, and the My work list.',
    keywords: ['dashboard', 'status', 'metrics', 'warranty', 'attention', 'my work', 'tables'],
    screenshot: '/docs/screenshots/dashboard.png',
    callouts: [
      { n: 1, label: 'KPI tiles' },
      { n: 2, label: 'My work list' },
    ],
    body: `Home depends on your role — Super Admin and IT Admin see the estate console; IT Support sees an operational queue; Managers see team work; Employees see **My IT**.

### IT console (Super Admin / IT Admin)

- **Metric cards** — Total, Assigned, Available, Under Repair, Retired, Open tickets. Click a card to open the matching list.
- **Support tickets** — Today / Yesterday / Tomorrow / date range counts.
- **Status table** — one coloured row per status (tag, count, share). Click a row to filter Assets.
- **Assets by location** — one row per office (from live Location records, never hardcoded city names). Each status is its own coloured column. Click a count to filter.
- There is **no Growth chart**. Estate size is the Total KPI. **Trends** (\`/api/dashboard/trends\`) is IT-staff only.
- **My work** — an ordered list: your overdue tickets, unassigned tickets, tickets waiting on the employee for 3+ days, stale repairs, incomplete checklists, contracts ending within 14 days, then warranties expiring within 14 days. Unassigned rows have **Assign to me**. The card caret collapses just this list (remembered in this browser). Status distribution, assets by location, and support tickets stay open.

### Other homes

- **IT Support** — the same **My work** list is the home page (KPI tiles are hidden). Shortcuts still jump to unassigned tickets, your tickets, and stale repairs.
- **Manager** — requests waiting on you, team tickets, team devices.
- **Employee (My IT)** — your assigned devices, Raise a ticket / Request a device, and your open tickets. See [My IT](/help/my-it).

### Troubleshooting

**Why is Expiring (14d) empty but I know of dead laptops?**
Already-expired kit is a separate Assets filter (**Already expired**). The dashboard list is upcoming work, not a dump of thousand-day-lapsed rows.`,
  },
  {
    id: 'assets-overview',
    title: 'Assets — Overview',
    category: 'Assets',
    summary: 'List, filter, export, and lifecycle actions for serialized assets.',
    keywords: ['assets', 'list', 'filter', 'export', 'assign'],
    screenshot: '/docs/screenshots/assets-list.png',
    body: `**Assets** is the core inventory. Each asset has a unique **asset number** (\`assetCode\`) — either typed in on create (sticker codes like \`NV-LAP-1042\`) or left blank so the system assigns \`AST-{location}-{category}-{seq}\` (e.g. AST-PUN-LAP-0001). You can rename a code later from **Edit**; confirm first, because old QR stickers and scan links for the previous number stop working. Duplicate codes are rejected.

Each asset also has an optional serial number.

### List features (Excel-grade grid)

- Sort any column by clicking the header
- **Columns** button — show/hide and drag headers to reorder
- Drag column borders to resize
- **Filter rows** box — quick client filter; page filters still apply for server data
- **Export CSV** — exports visible columns and current quick-filter results
- **Compact / Comfortable** density toggle
- Select rows for bulk status change, transfer, or retire (IT Admin+)
- **/** focuses the grid filter; **↑↓** moves row focus; **Ctrl+C** copies the selected row as tab-separated text for Excel (hint is also on the table toolbar)

A quiet **⧉** chip copies a single field (asset code, ticket number). That is not the same as **Duplicate** on the asset detail page, which creates a new record with a fresh code.

### Troubleshooting

**Why is this asset showing as still assigned?**
Assign is only cleared by **Return** / **Transfer** / **Retire**. Offboarding the person does not move the asset to Available.

**I renamed the asset code and the QR sticker 404s.**
The public scan URL is \`/scan/{assetCode}\`. Reprint the label after a code change.`,
  },
  {
    id: 'assets-assign-transfer',
    title: 'Assigning & Transferring Assets',
    category: 'Assets',
    group: 'Actions',
    summary: 'Assign to employees, transfer location, optional accessory checkout.',
    keywords: ['assign', 'transfer', 'employee', 'location'],
    screenshot: '/docs/screenshots/assign-modal.png',
    body: `### Assign

1. Open an **available** asset → **Assign**.
2. Pick target employee and optional accessories to check out simultaneously.
3. Asset status becomes \`assigned\`; assignment is recorded in history and audit log.

### Transfer

1. Open an assigned asset → **Transfer**.
2. Change location and/or assignee.
3. Transfer is an action, not a status — asset stays \`assigned\` if an employee remains.

### Retire

**Retire** moves asset to \`retired\` (requires reason). Only \`retired\` assets can reach \`disposed\`.

> [!WARNING]
> Retire is meant to be end-of-life. If the asset is still in active use, **Transfer** it instead of retiring it by mistake.`,
  },
  {
    id: 'assets-bulk',
    title: 'Bulk actions',
    category: 'Assets',
    group: 'Actions',
    summary: 'Change status, transfer, assign, or retire many selected assets at once.',
    keywords: ['bulk', 'select', 'retire', 'transfer', 'status', 'assign'],
    screenshot: '/docs/screenshots/assets-list.png',
    body: `On **Assets**, tick one or more rows. The toolbar then shows **Bulk status**, **Bulk transfer**, **Bulk assign**, and **Bulk retire**.

### What is working today

1. Select rows (header checkbox selects the current page).
2. Pick the action. Transfer asks for a location (and optional assignee). Assign asks for the employee. Retire asks for a reason.
3. The API applies the change per id and returns succeeded/failed counts. A row that is not eligible (already retired, invalid transition) is reported, not silently skipped without a count.

> [!NOTE]
> Bulk actions reuse the same lifecycle rules as the single-asset buttons. You cannot jump \`available → disposed\` in one step.`,
  },
  {
    id: 'assets-detail',
    title: 'Asset Detail & QR',
    category: 'Assets',
    summary: 'Show page, QR sticker, public scan link.',
    keywords: ['detail', 'qr', 'scan', 'show'],
    screenshot: '/docs/screenshots/asset-detail.png',
    body: `The asset **show** page lists all fields, assignment history, maintenance tickets, and a **QR sticker** card.

- **Download QR** — PNG encoding \`{PUBLIC_APP_URL}/scan/{assetCode}\`
- **Open scan page** — public mobile-friendly view (no login): **status, item, category, location, warranty days**. Anyone who can photograph the sticker can open this URL, so the page **never shows the assignee name or the serial number**. Cost, invoice, and history are also omitted.

> [!WARNING]
> Do not put names or serials on the printed sticker. The QR only needs the asset code.`,
  },
  {
    id: 'accessories-consumables',
    title: 'Accessories & Consumables',
    category: 'Accessories & Consumables',
    summary: 'The difference between peripherals you get back and stock you consume.',
    keywords: ['accessories', 'consumables', 'checkout', 'issue', 'stock', 'low-stock'],
    screenshot: '/docs/screenshots/accessories.png',
    body: `These are two different stock models. Do not mix them.

### Accessories (you expect them back)

Mice, chargers, docks, headsets. Each SKU has \`quantity_total\` vs \`quantity_checked_out\`. The Accessories home defaults to **Cards** (stock meters + Issue). Switch to **Table** for the Excel-grade grid (sort, columns, export).

1. Open **Accessories**.
2. **Checkout** to an employee (quantity can be more than 1).
3. **Check in** when the item comes back — that restores available quantity.
4. You can also attach accessories during **Assign** on an asset (same checkout).

### Consumables (you do not get them back)

Toner, cables, batteries. Each SKU has \`quantity_available\`.

1. Open **Consumables**.
2. **Issue** to an employee — quantity goes down and is recorded on their profile.
3. When quantity falls below \`low_stock_threshold\`, a notification fires and the item appears on the dashboard attention panel.

Both lists use the same Excel-grade grid as Assets.

Only **Super Admin, IT Admin, and IT Support** can list stock. Managers and Employees get 403 if they call the API.

> [!TIP]
> If IT is handing a laptop *and* a charger together, use Assign on the laptop and tick the charger in the same modal — or use an **Issue kit** from Settings. That is one history event, not two screens.

### Troubleshooting

**Low-stock alert for something we just restocked.**
Edit the SKU and raise \`quantity_available\` / \`quantity_total\`. The alert is a threshold on those fields, not a purchase order.

**Why can't a Manager see Accessories?**
Stock levels are IT-only. Managers see kit on an employee's profile when it is checked out to their report.`,
  },
  {
    id: 'employees',
    title: 'Employees & Profiles',
    category: 'Employees',
    summary: 'Directory, profile, assigned kit, and creating a login.',
    keywords: ['employees', 'profile', 'manager', 'login', 'EMP-'],
    screenshot: '/docs/screenshots/employee-profile.png',
    callouts: [
      { n: 1, label: 'Employment status chip' },
      { n: 2, label: 'Assigned assets and accessories' },
      { n: 3, label: 'Onboard / offboard checklist' },
    ],
    body: `**Employees** is the people directory. Search by name or employee code (\`EMP-…\`). Statuses: Active, Inactive, Contract Active, Contract Inactive.

### What is working today

- List uses the same Excel-grade grid as Assets (sort, columns, density, export).
- **Follow-up** filter: contracts ending within 14 days, or incomplete onboard/offboard checklists. Those rows also show a tag, appear on the dashboard **My work** list, and the profile warns when a contract is due soon.
- Click a row for the **profile**: identity, location/department, contract end date, assigned assets, accessories checked out, consumables issued, notes, and the **History** tab.
- **Create login** — Super Admin and IT Admin can tick this on Add employee. Super Admin can also create users from Settings → Users (the only path that can create an IT Admin).
- **Onboard / offboard checklists** start from the profile. Templates are edited in Settings → Onboard / Offboard.
- Managers viewing the list or profiles see **direct reports only** (API-enforced).

### Creating a login for an employee

1. Open **Employees → Add employee** (or edit an existing person who has no user).
2. Tick **Create login** and choose a role (usually Employee or Manager).
3. They sign in with their work email. Super Admin can reset or disable the account later under Settings → Users.

> [!NOTE]
> The very first Super Admin on a blank production database comes from \`SEED_MODE=bootstrap\` (see [Getting Started](/help/getting-started)), not from a wizard in the UI.

### Troubleshooting

**Search for EMP-1234 finds nothing.**
Type the code with or without the prefix; both work. Managers only see their reports.

**The person still appears in Assign pickers after they left.**
Offboard them. Inactive employees are hidden from assignment pickers; their history stays.`,
  },
  {
    id: 'maintenance',
    title: 'Maintenance & Repairs',
    category: 'Maintenance',
    summary: 'Hardware repair on a known asset — not the general helpdesk.',
    keywords: ['maintenance', 'repair', 'issue', 'vendor', 'stale'],
    screenshot: '/docs/screenshots/maintenance.png',
    body: `Use **Maintenance** when a *specific asset* is broken. VPN / password / software issues belong on **Support Tickets**.

### Lifecycle

\`reported → under_repair → repaired → reassigned\` (or \`cancelled\` from reported/under_repair).

### What is working today

- **Employees** can report an issue only on an asset assigned to them (API-enforced).
- **IT Support / IT Admin / Super Admin** run the queue: Start Repair, Mark Repaired (enter actual cost), Reassign, Cancel.
- Vendor name, estimated cost, expected completion, and actual cost are optional fields on the ticket.
- Starting repair sets the **asset** to \`under_repair\` in the same transaction. Reassignment returns it to \`assigned\` (if an employee remains) or \`available\`.
- Stale repairs appear on the dashboard **My work** list and open Maintenance pre-filtered to tickets reported 14+ days ago (\`staleDays=14\`).

> [!NOTE]
> Maintenance and Support Tickets are not linked yet. If the same incident exists in both places, keep the ticket numbers in a note on each record.`,
  },
  {
    id: 'warranty',
    title: 'Warranty Tracking',
    category: 'Reports & Analytics',
    summary: 'Warranty dates, expiry alerts, and where they appear on the dashboard.',
    keywords: ['warranty', 'expiry', 'alert', 'email'],
    body: `Assets store \`warranty_start\` and \`warranty_end\`.

### What is working today

- The **Open tickets** KPI replaced the old **Warranty ≤90d** tile on the main dashboard row.
- Warranties that expire within **14 days** appear on the dashboard **My work** list, with a link to the **Expiring (14d)** Assets filter.
- \`GET /dashboard/warranty-expiring\` defaults to **upcoming only** (\`bucket=expiring\`, \`withinDays=30\`). Pass \`bucket=expired\` for already-lapsed kit. Negative thousand-day rows no longer mix into the to-do list.
- Assets list **Warranty** chip: expiring in 14 / 30 / 90 days, or **Already expired**.
- **Reports → Warranty** is upcoming dates only (sorted soonest first).
- A daily cron still creates de-duplicated notifications at **90, 60, and 30 days** before expiry and emails IT Admins (SMTP when configured, console log otherwise).

> [!TIP]
> Use **Already expired** when you are writing off dead kit. Use **Expiring in 14 days** as the daily work list.`,
  },
  {
    id: 'reports',
    title: 'Reports',
    category: 'Reports & Analytics',
    summary: 'Download asset, employee, location, warranty, and supplies reports.',
    keywords: ['reports', 'csv', 'pdf', 'export'],
    screenshot: '/docs/screenshots/reports.png',
    body: `**Reports** offers CSV and PDF downloads for:

- Assets, Employees, Locations, Warranty
- **Supplies** — accessories and consumables summary

Requires \`report:run\` (Super Admin, IT Admin, IT Support, Manager). Employees have no Reports page.

### Who sees which export

- **Super Admin / IT Admin** — full estate, including supplies and vendor spend / renewals / overdue / scorecards.
- **IT Support** — estate reports plus supplies. Vendor spend, renewals, overdue payments, and scorecards are hidden (API returns 403).
- **Manager** — assets, employees, locations, warranty, and open requisitions, **scoped to their team**. Supplies and vendor reports are 403.

> [!NOTE]
> A Manager CSV of assets will not include another team's serials or cost. That is enforced on the API, not only by hiding cards.

### Troubleshooting

**The download is empty / errors.**
An export that matches zero rows returns an error instead of silently dumping the whole estate. Check filters and your role scope.`,
  },
  {
    id: 'import-export',
    title: 'Import & Export',
    category: 'Import & Reconciliation',
    summary: 'Background import jobs, dry-run, rollback, scoped export.',
    keywords: ['import', 'export', 'csv', 'excel', 'rollback'],
    screenshot: '/docs/screenshots/import-summary.png',
    body: `### Background import (Settings → Import jobs)

1. Upload CSV/XLSX (assets or employees).
2. Map file columns to canonical fields.
3. **Dry-run preview** — duplicates flagged with structured error codes.
4. **Commit** — processes in background; outcome donut chart shows created/updated/failed/duplicates.
5. **Rollback** — deletes rows this job created (IDs recorded on the job).

### Scoped export

**Assets** list **Export** respects active filters.

> [!NOTE]
> An export with zero matching rows returns an error instead of a silent full-estate dump — this guards against accidentally exporting everyone's data when a filter typo matched nothing.

Uploads are capped at **500 MB**. Structured error codes on failed rows tell you whether the location, category, or duplicate serial was the problem. Run history stays on the Import jobs tab.

### Troubleshooting

**Dry-run looked fine, commit failed some rows.**
Someone else created the same serial between preview and commit, or a location code does not exist. Open the job's error list; it is per-row.

**Rollback did not restore edits.**
Rollback deletes rows **this job created**. Updates to pre-existing rows are not undone.`,
  },
  {
    id: 'reconciliation',
    title: 'HR / inventory reconciliation',
    category: 'Import & Reconciliation',
    summary: 'Upload an HR or inventory CSV and see what is only in the file, only in NewVision, or matched.',
    keywords: ['reconciliation', 'hr', 'diff', 'csv', 'match'],
    screenshot: '/docs/screenshots/reconciliation.png',
    callouts: [
      { n: 1, label: 'Kind (employees or assets)' },
      { n: 2, label: 'Match field' },
      { n: 3, label: 'Run history' },
    ],
    body: `**Settings → Reconciliation** (IT Admin / Super Admin). This is a **set-diff**, not a live directory sync.

1. Choose **Employees** or **Assets**.
2. Choose the match field — employee code or email; asset code or serial.
3. Upload a CSV (max 500 MB).
4. The run reports **matched**, **only in file**, and **only in system**.

Use “only in file” as joiners to import. Use “only in system” as leavers / missing stickers to investigate. Nothing is auto-deleted.

> [!NOTE]
> There is no live AD / HR connector on purpose. Upload when HR sends a roster.

### Troubleshooting

**Counts look wrong.**
Confirm the match field. Matching on email will miss people who only have an employee code in the file.`,
  },
  {
    id: 'requests',
    title: 'Asset Requests',
    category: 'Requests',
    summary: 'Employee submit → manager approve → IT fulfill.',
    keywords: ['requests', 'approve', 'reject', 'fulfill'],
    screenshot: '/docs/screenshots/requests.png',
    body: `Single-step approval — not a workflow engine.

1. **Employee** submits asset or accessory request with reason.
2. **Manager** approves (optional comment) or rejects (reason required).
3. **IT Admin** marks **Fulfilled** after manual assignment/checkout.

Statuses: \`pending → approved|rejected → fulfilled\`.

Managers see a **one-click Approve** on the request (and on My work). Reject still needs a reason. IT marks Fulfilled only after the physical assign/checkout — the button does not move the asset by itself.

### Troubleshooting

**The manager cannot see the request.**
They must be the requester's **manager** on the employee record. Update the profile if the reporting line is wrong.

**Fulfilled but the laptop is still Available.**
Fulfill is a request status. You still have to **Assign** the asset (or check out the accessory).`,
  },
  {
    id: 'procurement-overview',
    title: 'Vendor & procurement overview',
    category: 'Procurement',
    summary: 'Vendors, requisitions, purchase orders, receiving, invoices, and contracts.',
    keywords: ['procurement', 'vendor', 'po', 'requisition', 'grn'],
    screenshot: '/docs/screenshots/vendors.png',
    callouts: [
      { n: 1, label: 'Procurement sidebar' },
      { n: 2, label: 'Vendors list' },
    ],
    body: `The **Procurement** sidebar (Super Admin and IT Admin) covers the buying cycle after a need is known. Managers see **their team's requisitions** only. IT Support and Employees do not have this module.

### What is in scope

- Vendor onboarding, suspension, blacklisting, and bank-detail re-approval
- A requisition form that matches the company approval-request email
- Parallel approval (To = required, Cc = watchers) with green / amber / red icons
- Convert an approved requisition to a purchase order, receive goods (including partials), record invoices with a 3-way match
- Contracts (warranty / AMC / SLA / licenses) with 90/60/30/7-day renewal alerts
- Auto-create assets, accessories, consumables, or license entitlements from a GRN — later PO/GRN changes **flag** those records instead of deleting them

> [!WARNING]
> NewVision tracks payment **status**. It does not move money, run reverse auctions, or OCR invoices.

Read next: [Vendors](/help/procurement-vendors) → [Requisitions](/help/procurement-requisition) → [Approvals](/help/procurement-approvals) → [PO / GRN / invoices](/help/procurement-po-grn) → [Handoff](/help/procurement-handoff) → [Contracts](/help/procurement-contracts).

### Troubleshooting

**I am a Manager and Vendors is missing.**
Correct. Managers only see **their team's requisitions**. Super Admin / IT Admin own vendors, POs, and contracts.`,
  },
  {
    id: 'procurement-vendors',
    title: 'Managing vendors',
    category: 'Procurement',
    group: 'Vendors',
    summary: 'Onboard a supplier, preferred flag, bank-detail re-approval, suspend, and blacklist.',
    keywords: ['vendor', 'blacklist', 'suspend', 'preferred', 'bank'],
    screenshot: '/docs/screenshots/vendors.png',
    callouts: [
      { n: 1, label: 'Status filter' },
      { n: 2, label: 'Preferred flag' },
      { n: 3, label: 'Open vendor' },
    ],
    body: `Open **Vendors** (Super Admin / IT Admin). Statuses:

| Status | Meaning |
|--------|---------|
| Draft | Started, not submitted |
| Pending approval | Waiting for IT Admin / Super Admin |
| Active | Can be picked on a requisition or PO |
| Suspended | Temporarily blocked from new buying |
| Blacklisted | Permanently blocked from new buying |

**Preferred** is a separate star/flag on an **active** vendor (not its own status). Preferred names sort first in the requisition vendor picker.

### Onboarding

1. **New vendor** — legal name, category, contacts, GST/PAN as used internally.
2. Submit for approval if you are not allowed to activate it yourself.
3. **Bank details** on an already-active vendor do **not** apply instantly. They sit pending until Super Admin / IT Admin confirms (highest fraud-risk field).

### Suspend / blacklist

Use the status action on the vendor. Suspended or blacklisted vendors **cannot** be selected on a new requisition or PO. Existing open POs stay visible so you can close them out.

### Troubleshooting

**I typed a new vendor name on a requisition.**
That creates a **pending-approval** vendor, not an active one. Someone with procurement admin must activate it before Convert to PO will use it cleanly.

**Bank change vanished.**
It is waiting for re-approval, not discarded. Open the vendor — pending bank details are listed until confirmed.`,
  },
  {
    id: 'procurement-approvals',
    title: 'Approval chain',
    category: 'Procurement',
    group: 'Requisitions',
    summary: 'Required To vs Cc watchers, and the green / amber / red status icons.',
    keywords: ['approval', 'approver', 'to', 'cc', 'icon'],
    screenshot: '/docs/screenshots/requisition-detail.png',
    callouts: [
      { n: 1, label: 'Required To approvers (green = approved)' },
      { n: 2, label: 'Convert to PO' },
      { n: 3, label: 'Manual correction' },
    ],
    body: `Each requisition has an **approval chain**. When you **Submit for approval**, NewVision rebuilds the chain from the tenant **approval matrix** (\`ApprovalMatrixRule\`: amount threshold, optional category, role, To vs Cc, parallel vs sequential). Your line manager is added as a **Cc** watcher when they are not already on the chain. You do not pick approvers on the requisition form.

- **To** (required) — every required approver must **Approve** before **Convert to PO** lights up.
- **Cc** (watcher) — notified, not blocking.

Icons (colour **and** shape):

| Icon | Meaning |
|------|---------|
| Green check | Approved |
| Amber clock | Pending |
| Red X | Rejected |

Hover a chip for To/Cc, status, and any comment.

Approvals are **parallel** — required people can approve in any order. A **material** edit resets every required approver to pending.

Convert to PO is Super Admin / IT Admin after the chain is green. Managers approve their team's PRs; they do not convert.

### Troubleshooting

**Convert is disabled.**
A required To is still pending or rejected, or you are not procurement admin.

**My approval disappeared.**
Someone made a material edit (total, vendor, qty, lines, category, procurement type). That starts a new revision on purpose.`,
  },
  {
    id: 'procurement-requisition',
    title: 'Raising and editing a requisition',
    category: 'Procurement',
    summary: 'The real template fields, material vs trivial edits, and resubmit after reject.',
    keywords: ['requisition', 'approval', 'revision', 'line item'],
    screenshot: '/docs/screenshots/requisition-form.png',
    callouts: [
      { n: 1, label: 'Template fields' },
      { n: 2, label: 'Line items' },
      { n: 3, label: 'Submit for approval' },
    ],
    body: `Open **Requisitions → New requisition**. Required fields match the internal approval email:

1. **Request Title**, **Requesting Department** (picker or free text), **Date**
2. **Business Requirement**, **Proposed Make & Model**, **Category**
3. **Line items** — Product, Unit Cost, Quantity, commercial/notes (add/remove rows)
4. **Total** auto-calculates (Σ unit × qty + tax) but you can override a negotiated figure
5. **Vendor** (preferred/active only) or type a new name to create a pending-approval vendor
6. **Budget Head**, **Procurement Type**, **Deployment Location** (multi + Remote Employees)
7. **Expected procurement date** and **Expected deployment date**
8. Attach the quote/PDF, **Save draft** or **Submit for approval**

On **Submit for approval**, required **To** approvers and **Cc** watchers are resolved from the approval matrix (requisition total + category) and your manager — not chosen on this form. Material edits that bump revision run the same resolver again.

### Editing after submit

- **Draft** — fully editable, no re-approval.
- **Pending approval** — a *trivial* edit (title, business-requirement typo) keeps the same revision. A *material* edit (total, vendor, quantity, line items, category, procurement type) increments **revision**, resets every required approver to pending, and notifies them.
- **Approved but not converted** — the same material-edit rule; the UI warns you before Edit.
- **Rejected** — edit and **Submit** again (new revision) instead of starting from scratch.
- **Withdraw / cancel** needs a reason. Cancelled rows stay visible with history.

> [!TIP]
> Every save writes a procurement activity log **and** the global audit log. The detail page timeline is the readable history.`,
  },
  {
    id: 'procurement-po-grn',
    title: 'Purchase orders, receiving, and invoices',
    category: 'Procurement',
    summary: 'Amend a sent PO, void a wrong GRN, and 3-way match invoices.',
    keywords: ['purchase order', 'grn', 'invoice', 'three way', 'amend'],
    screenshot: '/docs/screenshots/po-detail.png',
    callouts: [
      { n: 1, label: 'PO status + Mark sent' },
      { n: 2, label: 'Record GRN / Amend / Cancel' },
      { n: 3, label: 'Notes (append-only)' },
    ],
    body: `After all required approvers approve, **Convert to PO**. Then:

1. **Mark sent** when the PO is issued to the vendor.
2. **Amend** (quantity, price, delivery, lines) creates a new revision and keeps the previous snapshot. PDF export is marked amended.
3. **Record GRN** for what actually arrived (partials allowed). Condition notes and discrepancy (short/over/damaged) are optional.
4. **Void GRN** if the receipt was wrong — this restores received-vs-ordered totals. Do not edit history in place.
5. **Short-close** a partially received PO that will never be completed.
6. **Cancel** before it is fully received, with a reason.

### 3-way match

Recording a vendor invoice against a PO compares amount and received quantities to the PO within a **2%** tolerance (\`PROCUREMENT_MATCH_TOLERANCE_PCT\`). **Exception** invoices need a resolution note before they can be approved for payment.

If the PO/GRN is amended or voided after assets were auto-created, those assets get a **Procurement mismatch** flag. Reconcile them; they are never silently deleted.

Payment tracking is a **status** on the invoice (unpaid / partial / paid / overdue). NewVision does not push a bank file.

### Troubleshooting

**Partial delivery — can I GRN twice?**
Yes. Each GRN adds received quantity. Short-close when the remainder will never arrive.

**3-way match exception.**
Open the invoice, add a **resolution note**, then approve for payment. You cannot skip the note.`,
  },
  {
    id: 'procurement-handoff',
    title: 'Procurement → asset handoff',
    category: 'Procurement',
    group: 'Receiving',
    summary: 'How a GRN creates asset / accessory / consumable records, and mismatch flags.',
    keywords: ['handoff', 'grn', 'auto create', 'mismatch', 'serialized'],
    screenshot: '/docs/screenshots/po-detail.png',
    callouts: [
      { n: 1, label: 'GRN / receive' },
      { n: 2, label: 'Handoff records' },
      { n: 3, label: 'Mismatch flag' },
    ],
    body: `When you record a GRN, NewVision can **hand off** received lines into inventory:

- **Serialized** hardware → Asset records (new \`AST-…\` codes) at the deployment location / category on the line.
- Accessories / consumables → stock quantity increases.
- License lines → entitlement counts on the contract.

Those new rows appear on the PO as **handoffs**. Open an asset from there to Assign it to someone.

### After the fact

If you **amend** the PO or **void** a GRN after handoff, the inventory rows are **not deleted**. They are flagged **Procurement mismatch** so you can reconcile (edit, retire, or note) instead of silently losing serial history.

> [!WARNING]
> Handoff is not Assign. A newly created laptop sits **available** until you Assign it to the employee.

### Troubleshooting

**GRN succeeded but I see no asset.**
Check the line **kind** (serialized vs accessory vs license) and that category + location were set. Non-serialized lines never create \`AST-\` codes.`,
  },
  {
    id: 'procurement-contracts',
    title: 'Contracts, renewals, and vendor scorecards',
    category: 'Procurement',
    summary: 'SLA coverage on assets, renew/clone a term, and weighted vendor scores.',
    keywords: ['contract', 'amc', 'sla', 'renewal', 'scorecard'],
    screenshot: '/docs/screenshots/contracts.png',
    callouts: [
      { n: 1, label: 'Contracts list' },
      { n: 2, label: 'Renewal window' },
    ],
    body: `**Contracts** stores warranty / AMC / SLA / license subscriptions, linked assets, entitlement vs usage, and an internal owner.

- Renewal alerts fire at **90 / 60 / 30 / 7** days (same de-dupe idea as warranty alerts).
- **Renew / clone term** copies the contract into a new date range rather than forcing re-entry.
- License contracts flag when usage approaches the contracted seat count.
- Coverage is shown on the **asset detail** page.

**Scorecards** combine on-time delivery (PO delivery date vs first GRN), quality (GRN discrepancies + repair tickets), plus manual price and responsiveness scores. The overall weighted score appears when picking a vendor.

Bank details on an **active** vendor do not apply instantly — they sit pending until Super Admin / IT Admin approves (highest fraud-risk field). Suspended or blacklisted vendors cannot be selected on a new requisition or PO.`,
  },
  {
    id: 'tickets-raise',
    title: 'Raising a support ticket',
    category: 'Support tickets',
    summary: 'Open a general IT helpdesk ticket, optionally from a template.',
    keywords: ['ticket', 'helpdesk', 'raise', 'template', 'vpn', 'password'],
    screenshot: '/docs/screenshots/tickets.png',
    callouts: [
      { n: 1, label: 'Template picker' },
      { n: 2, label: 'Category (sets a default priority)' },
      { n: 3, label: 'Submit ticket' },
    ],
    body: `Use **Support Tickets** (or **My tickets** / **Raise a ticket** in My IT) for software, network, access, or general issues. Hardware repairs on a known asset still go through **Maintenance**; asking for a new laptop still goes through **Requests**.

You can also email the shared helpdesk mailbox — a new message opens a ticket, and a reply with \`[TCK-000123]\` in the subject (or proper In-Reply-To headers) adds a public comment.

1. **Open Raise a ticket**.
2. **Choose a category** — Access & Account defaults to High; General defaults to Low. You can still change priority.
3. **Describe the issue**. Optionally attach a file and pick one of your own assets.
4. **Submit** — you receive a ticket number like \`TCK-000123\` (quiet ⧉ chip copies it).

Employees see a short form (category, priority, description, optional asset). IT staff can still start from a template and add watchers.

IT Support is auto-assigned when someone is available; otherwise the ticket stays Open for the queue.

Staff can **@mention** colleagues on the ticket, copy a ready **email draft** (mail icon) to paste into Outlook, and — for Super Admin / IT Admin / IT Support only — use the header **Chat** launcher (#it-ops plus 1:1 DMs). Pasting a ticket number like \`TCK-000123\` in chat becomes a clickable preview.`,
  },
  {
    id: 'tickets-statuses',
    title: 'Understanding ticket statuses',
    category: 'Support tickets',
    group: 'Lifecycle',
    summary: 'Open, assigned, in progress, waiting on employee, resolved, closed, and reopened.',
    keywords: ['status', 'lifecycle', 'reopen', 'overdue'],
    screenshot: '/docs/screenshots/tickets.png',
    callouts: [
      { n: 1, label: 'Status chips' },
      { n: 2, label: 'Overdue flag' },
    ],
    body: `Lifecycle: \`open → assigned → in_progress → waiting_on_employee → resolved → closed\`. **Reopened** returns the ticket to assigned/in progress.

- **Waiting on employee** pauses the first-response overdue clock. When the requester replies, the ticket returns to in progress (or assigned) and the clock resumes.
- **Overdue** is a visual label from Settings first-response targets (Urgent 2h, High 8h, Normal 1 day, Low 3 days) plus any due date. There is no escalation engine or business-hours calendar.
- **Resolved** is when IT believes the work is done — that is when you are asked to rate the resolution.
- **Closed** is the final state. A requester comment on a resolved/closed ticket reopens it.

### First-response targets

Urgent **2 hours**, High **8 hours**, Normal **1 day**, Low **3 days**. There is no business-hours calendar and no escalation engine — overdue is a visual + My work item only.

### Troubleshooting

**The ticket says overdue while we are waiting on the employee.**
Waiting on employee **pauses** the first-response clock. If it is still overdue, the first response was already late before you paused it.`,
  },
  {
    id: 'tickets-comments-watchers',
    title: 'Comments and watchers',
    category: 'Support tickets',
    group: 'Lifecycle',
    summary: 'Public replies, internal notes, and extra people on the ticket.',
    keywords: ['comment', 'internal', 'watcher', 'cc'],
    screenshot: '/docs/screenshots/ticket-detail.png',
    callouts: [
      { n: 1, label: 'Ticket header (number, SLA, channel)' },
      { n: 2, label: 'Assign to me / Copy email' },
      { n: 3, label: 'Canned reply + public vs internal' },
    ],
    body: `1. **Public replies** are visible to the requester and watchers.
2. **Internal notes** (IT staff only) stay on the staff thread.
3. **Watchers** get the same notifications as the requester. Add a manager or the colleague who reported the issue.
4. **Attachments** — **Attach file**, or paste a screenshot from Snipping Tool (**Ctrl+V** / **Paste screenshot**) on the ticket or while raising one.

Anyone who can view the ticket can read public comments. Internal notes never appear for employees.`,
  },
  {
    id: 'tickets-it-queue',
    title: 'Managing the IT queue',
    category: 'Support tickets',
    group: 'For IT staff',
    summary: 'Assignment, canned replies, time logging, and reports for IT staff.',
    keywords: ['queue', 'assign', 'canned', 'time', 'reports'],
    screenshot: '/docs/screenshots/tickets.png',
    callouts: [
      { n: 1, label: 'Status chips with counts' },
      { n: 2, label: 'Quick views' },
      { n: 3, label: 'Bulk actions' },
    ],
    body: `IT Admin and IT Support see every ticket. Super Admin has the same access.

1. **Filter** with status chips or built-in quick views: My tickets, Unassigned, Overdue, Awaiting my reply.
2. The list shows **Requester** (Name · EMP-code), **Assignee**, and an **Age / SLA** badge matching the ticket header — you do not need to open a ticket to see who owns it.
3. **Assign** from the ticket or in bulk from the list.
4. **Insert a canned response** before sending a reply (Settings → Helpdesk). A snippet can also **wait on the employee** or **resolve** the ticket when you send it.
5. **Log time** in minutes; the running total appears on the ticket and in reports.
6. **Reports** show volume by status/category/priority, average resolution time, overdue open tickets, closed counts per staff member, and average satisfaction.

Managers see their own tickets plus direct reports. They cannot assign, add internal notes, or log time.

Quick views include **Email-in** for tickets that arrived by mail. The ticket shows a Portal vs Email channel chip.

### Assign to me

On an unassigned ticket (or from **My work**), **Assign to me** takes ownership in one click. On the ticket list, focus a row and press **I**.

### Requester's assets

IT staff see a side panel of devices currently assigned to the requester so you can tell a VPN ticket from a broken laptop without leaving the page.

### Duplicate-linking

**Duplicate of** closes an open ticket with a pointer to the original. Comments stay on each ticket; nothing is merged.

### Troubleshooting

**I cannot assign.**
Managers and employees cannot assign. IT Support / IT Admin / Super Admin can. If the ticket is already closed, reopen it first.`,
  },
  {
    id: 'tickets-email-in',
    title: 'Email-in (reply to create or update a ticket)',
    category: 'Support tickets',
    summary: 'Send mail to the shared helpdesk address to open a ticket; reply to add a comment.',
    keywords: ['email', 'imap', 'reply', 'helpdesk', 'mailbox'],
    body: `One shared mailbox (configured as \`HELPDESK_MAILBOX\`, typically it@your-domain).

- A **new** email creates a ticket (channel: Email). The sender is matched to an Employee by email.
- A **reply** is matched first by \`In-Reply-To\` / \`References\` (the app stores outbound Message-IDs), then by \`[TCK-000123]\` in the subject if the client stripped headers.
- Out-of-office auto-replies, bulk/list mail, and mail from the system's own address are discarded. The same Message-ID is never processed twice.

> [!NOTE]
> If nobody matches the sender's address, the ticket is still created and flagged so IT can link it manually. NewVision never auto-creates an employee record from a random email address.

> [!TIP]
> Reply to any ticket notification to add a public comment. Just don't remove the \`[TCK-000123]\` ticket number from the subject line.

Settings → Helpdesk shows mailbox status and a connection check. Local development without IMAP simply does not poll.

### Troubleshooting

**Email-in did nothing.**
IMAP is only polled when mailbox env vars are set. Settings → Helpdesk shows connection status. Local default is “not polling”. Out-of-office and bulk mail are discarded on purpose.

**The sender is unknown.**
The ticket is still created and flagged so IT can link the employee manually. NewVision never auto-creates a person from a random address.`,
  },
  {
    id: 'tickets-emails',
    title: 'Who gets ticket emails',
    category: 'Support tickets',
    group: 'For IT staff',
    summary: 'Which events email the requester, watchers, assignee, and the IT queue.',
    keywords: ['email', 'notify', 'digest', 'watcher', 'assignee'],
    screenshot: '/docs/screenshots/ticket-detail.png',
    callouts: [{ n: 1, label: 'Mail / copy-draft icon' }],
    body: `All ticket mail uses branded HTML, includes \`[TCK-000123]\` in the subject, and sets Reply-To to the helpdesk mailbox so a reply can email-in as a public comment.

| Event | Requester | Watchers | Assignee | Other IT staff |
|-------|-----------|----------|----------|----------------|
| Ticket created (portal or email-in) | Confirmation | — | Assigned-to mail if auto-assigned | Unassigned-queue mail if nobody is assigned |
| Assigned / reassigned | Status update | Status update | Assigned-to mail | — |
| Public comment | Comment mail (not the author) | Comment mail | Comment mail | @mentioned users |
| Internal note | No | No | Comment mail to staff | @mentioned staff |
| Status change (waiting / resolved / closed / reopened) | Status update | Status update | Status update | — |
| CSAT prompt | On resolve (in-app; email if mail is on) | — | — | — |
| Daily digest | Never | Never | If they chose digest | Staff who chose digest |

IT staff who set **Daily digest** skip per-event mail (\`honorDigest\`) and receive one summary instead. Requesters and watchers are **never** digested.

> [!WARNING]
> Internal notes never email the employee. If you meant the requester to see it, send a **public** reply.

### Troubleshooting

**Staff got nothing, the employee did.**
That staff member is likely on digest, or they are not assignee/watcher.

**Two digest emails the same day.**
Should not happen — the job writes a \`[digest YYYY-MM-DD]\` notification marker and skips a second run.`,
  },
  {
    id: 'tickets-rating',
    title: 'Rating a resolved ticket',
    category: 'Support tickets',
    group: 'Lifecycle',
    summary: 'Requesters rate a resolution once on a 1–5 scale.',
    keywords: ['csat', 'rating', 'satisfaction', 'resolved'],
    screenshot: '/docs/screenshots/ticket-detail.png',
    callouts: [{ n: 1, label: 'How did we do?' }],
    body: `When a ticket moves to **resolved**, the requester gets a notification to rate it.

1. Open the ticket and use **How did we do?**
2. Pick 1–5 stars and an optional comment.
3. You can rate only once. If you **reopen** instead of rating, the prompt is dropped for that ticket.

Averages appear on Ticket reports, overall and per staff member.`,
  },
  {
    id: 'tickets-notify-pref',
    title: 'Ticket email notification preference',
    category: 'Support tickets',
    group: 'For IT staff',
    summary: 'IT staff can choose immediate emails or a daily digest.',
    keywords: ['digest', 'email', 'notifications', 'noise'],
    screenshot: '/docs/screenshots/settings.png',
    callouts: [{ n: 1, label: 'Immediate vs Daily digest' }],
    body: `Spiceworks users often report email overload. NewVision keeps in-app notifications immediate and lets IT staff choose email frequency.

1. Open **Settings → Account**.
2. Under **Ticket email notifications**, pick **Immediate** or **Daily digest**.
3. Digest is one email per day covering new tickets, tickets assigned to you, and tickets still open on your queue.

Requesters and watchers always get immediate email for events on their tickets.`,
  },
  {
    id: 'tickets-search-views-export',
    title: 'Searching, quick views, bulk actions, and export',
    category: 'Support tickets',
    group: 'For IT staff',
    summary: 'Find tickets by text, reuse views, assign or close many at once, export CSV/PDF.',
    keywords: ['search', 'views', 'bulk', 'export', 'duplicate'],
    screenshot: '/docs/screenshots/tickets.png',
    callouts: [
      { n: 1, label: 'Text search' },
      { n: 2, label: 'Quick views' },
      { n: 3, label: 'CSV / PDF' },
    ],
    body: `1. **Search** looks at ticket number, subject, description, and comments (internal comments only for IT).
2. **Save view** stores the current filters, same pattern as the Assets list.
3. **Bulk assign** and **Bulk close** apply to selected rows (IT staff). Closing asks for one shared comment.
4. **Export** CSV/PDF respects the current filters.
5. **Duplicate of** closes an open ticket with a link to the original — comments stay on each ticket; nothing is merged.
6. Click a requester or assignee name for a **contact card** (email, department, location, profile link).`,
  },
  {
    id: 'notes-manual-edit',
    title: 'Notes, manual correction, and backfilling',
    category: 'Settings',
    summary:
      'Append-only notes on records, and a reason-required override for Super Admin / IT Admin.',
    keywords: ['notes', 'manual', 'override', 'backfill', 'audit'],
    screenshot: '/docs/screenshots/audit-log.png',
    callouts: [
      { n: 1, label: 'Notes' },
      { n: 2, label: 'Manual correction' },
      { n: 3, label: 'Audit filter' },
    ],
    body: `Every major record (assets, employees, accessories, consumables, maintenance, requests, tickets, locations) has a **Notes** section. Notes are append-only — correct a mistake with a follow-up note.

1. **Add a note** on the record. Optionally set an occurred date in the past; it is tagged **Backfilled**.
2. **Manual correction** (Super Admin and IT Admin) sits apart from Assign/Transfer. Every save needs a **reason** and a confirm step showing old → new.
3. Review **Audit Log → Manual overrides** to see every flagged correction.

> [!WARNING]
> Manual correction does not bypass field validation — an unknown status or a missing employee is still rejected. There is no bulk manual-edit tool, and no way to edit or delete an audit row once written.

### Where you will see it

Asset, employee, accessory, consumable, maintenance, request, ticket, location, vendor, requisition, PO, and contract show pages. Procurement corrections use a **narrow field allowlist** (you cannot free-type a new status machine).

### Troubleshooting

**The save button stays disabled.**
A reason is required, and old → new must actually differ.

**Employees cannot correct a ticket subject.**
Requesters can edit **their own** ticket subject/description while the ticket is open. Other records need IT Admin / Super Admin manual correction.`,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    category: 'Notifications',
    summary: 'Bell icon, ticket email vs digest, and team-chat alerts.',
    keywords: ['notifications', 'bell', 'alert', 'chat', 'digest'],
    screenshot: '/docs/screenshots/notifications.png',
    body: `## In-app bell

The header **bell** shows unread notifications for the signed-in user. Click a row to open the related record. Types include:

- Warranty threshold days (90 / 60 / 30)
- Asset assigned / transferred
- Repair reported and status changes
- Low stock
- Asset requests (submitted / approved / rejected / fulfilled)
- Support-ticket events (create, assign, comment, status, @mention)
- Staff chat messages (\`chat_message\`) when someone posts in a conversation you belong to
- Chat @mentions (\`chat_mention\`) and thread replies (\`chat_thread_reply\`), each with a deep link to \`/chat?c=…&m=…\`

## Email

Ticket mail is branded HTML with \`[TCK-000123]\` in the subject and a Reply-To of the helpdesk mailbox. Without \`SMTP_HOST\` or \`RESEND_API_KEY\`, the backend **logs the message to the console** — it does not fail the API.

IT staff pick **Immediate** vs **Daily digest** under **Settings → Account**. Digest is one email covering new tickets, tickets assigned to you, and tickets still open on your queue. A second digest run the same calendar day is skipped (idempotent).

IT Support opens that radio from the **avatar menu → Settings** (Account tab).

Requesters and watchers always get **immediate** ticket email when mail is configured. Digest only applies to ticket staff.

See [Who gets ticket emails](/help/tickets-emails) for the event-by-event table.

> [!TIP]
> Use the mail icon on a ticket to **copy a ready Outlook draft**. That does not send mail; it is a paste helper.

### Troubleshooting

**Why didn't my ticket email arrive?**
1. Mail transport: Settings does not send until \`RESEND_API_KEY\` or \`SMTP_HOST\` is set. Locally, look at the Nest console.
2. Staff digest: if you chose Daily digest you will not get per-event mail.
3. Spam / shared mailbox filters.
4. You are not the requester, assignee, or a watcher.

**Bell badge never clears.**
Opening the panel marks rows read as you click them. Refresh if a WebSocket drop left a stale count — the next poll corrects it.`,
  },
  {
    id: 'audit',
    title: 'Audit Log',
    category: 'Settings',
    summary: 'Append-only change history (Super Admin & IT Admin).',
    keywords: ['audit', 'history', 'log'],
    screenshot: '/docs/screenshots/audit-log.png',
    body: `Every mutation writes an **audit_logs** row: entity, action, summary, old/new JSON, actor, timestamp.

Expand a row for full before/after payloads. Copy entry IDs via the copy icon.`,
  },
  {
    id: 'roles',
    title: 'Roles & Permissions',
    category: 'Reference',
    summary: 'Five roles and what each can see and do.',
    keywords: ['roles', 'rbac', 'permissions', 'security'],
    body: `Permissions are enforced on the API. The UI hides unauthorized actions, but a crafted request still gets 403.

| Capability | Super Admin | IT Admin | IT Support | Manager | Employee |
|---|---|---|---|---|---|
| Estate dashboard / metrics | Yes | Yes | Queue home (no KPI tiles) | Team home | My IT |
| Dashboard trends | Yes | Yes | Yes | No | No |
| Assets create / assign / transfer / retire | Yes | Yes | Read | Read (team) | Own assigned |
| Hard-delete retired/disposed assets | Yes | No | No | No | No |
| Locations / categories / departments | Yes | Yes | Read (locations) | Read (locations) | No |
| Accessories / consumables list | Yes | Yes | Yes | No (403) | No (403) |
| Employees create / offboard / login | Yes | Yes | Read | Direct reports | Own profile (phone/title) |
| Maintenance queue | Yes | Yes | Yes | Report only | Report own asset |
| Support tickets (all) | Yes | Yes | Yes | Own + reports | Own only |
| Internal notes / assign / canned / time | Yes | Yes | Yes | No | No |
| Requests approve | Yes | Yes | No | Yes (team) | Submit only |
| Fulfill requests | Yes | Yes | No | No | No |
| Procurement (vendors, PO, contracts) | Yes | Yes | No | Requisitions (team) | No |
| Reports | Full | Full | No vendor spend | Team-scoped subset | No |
| Import / reconcile / webhooks / kits | Yes | Yes | No | No | No |
| Settings → Users | Yes | No | No | No | No |
| Audit log | Yes | Yes | No | No | No |
| Team chat | Yes | Yes | Yes | No | No |
| Notes on records | Same as parent record | Same | Same | Team-scoped | Own assets / tickets |

View **your** permission tags under **Settings → Account**.

IT Support, IT Admin, and Super Admin open Settings from the **account menu** (avatar, bottom of the sidebar) as well as the Settings nav item (IT Admin / Super Admin). IT Support's Settings tabs are **Account** and **Helpdesk** only.

> [!NOTE]
> Managers can still **search** people and requisitions, but the search is composed with the same visibility filter as the list — a name match cannot leak another team's PR or employee.

### Troubleshooting

**Why can't I see this menu item?**
Almost always role. Compare the table above. If the item is visible but the API returns 403, you are signed in as the wrong role or the session expired — sign out and back in.`,
  },
  {
    id: 'qr-webhooks',
    title: 'QR Codes, labels & public scan',
    category: 'Assets',
    group: 'QR & labels',
    summary: 'Printable stickers and the public, login-free scan page.',
    keywords: ['qr', 'scan', 'label', 'sticker', 'public'],
    screenshot: '/docs/screenshots/scan-page.png',
    body: `Every asset can show a **QR sticker** that encodes \`{PUBLIC_APP_URL}/scan/{assetCode}\`.

### What is working today

- **Download QR** on the asset show page — PNG of that public URL.
- **Print labels** — 20-up PDF of selected assets from the Assets list (IT Admin+).
- **Public scan** (\`/scan/:code\`) works **without login**. It shows status, item, category, location, and warranty days.
- The public page **never** shows assignee name, serial number, cost, invoice, or history. That is deliberate PII protection — anyone who photographs the sticker can open the URL.
- Authenticated staff who open the same code from inside the app still use the normal asset show page.

### Webhooks (separate Settings tab)

Settings → Webhooks (IT Admin+) subscribe to \`asset.created\` and \`asset.status_changed\` with HMAC-SHA256 signatures. The secret is shown **once** on create.

\`\`\`
POST /webhooks/your-endpoint
X-NewVision-Signature: sha256=…
{ "event": "asset.status_changed", "assetCode": "AST-PUN-LAP-0001" }
\`\`\`

> [!WARNING]
> Do not print names or serials on the sticker. The QR only needs the asset code.`,
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts & Command Palette',
    category: 'Reference',
    summary: 'Every shortcut, ⌘K jump, and the ? Help key.',
    keywords: ['keyboard', 'shortcuts', 'hotkeys', 'command palette', 'ctrl+k'],
    screenshot: '/docs/screenshots/command-palette.png',
    callouts: [
      { n: 1, label: 'Search box' },
      { n: 2, label: 'Role-filtered destinations' },
    ],
    body: `### Command palette

Press **⌘K** / **Ctrl+K** anywhere in the signed-in app (header search chip, or the keys). Type a screen name or a record code (\`AST-…\`, \`EMP-…\`, \`TCK-…\`, \`PO-…\`, \`PR-…\`). Arrow keys move the highlight; Enter opens it.

The command palette is **role-filtered**. Employees see their screens and “Raise a ticket”, not New asset or Audit Log. IT Support sees Account (digest) instead of the full Settings set. Hidden destinations do not appear in ⌘K.

Inside Help, the same chord opens **docs search** instead of the app palette.

### App shortcuts

| Shortcut | Action |
|----------|--------|
| \`⌘K\` / \`Ctrl+K\` | Command palette (or docs search when you are already in Help) |
| \`?\` | Open Help (ignored while typing in an input) |
| \`Ctrl+/\` | Keyboard shortcuts overlay (this is **not** Help) |
| \`/\` | Focus the grid filter on a table page |
| \`Esc\` | Clear row focus / close expanded rows / close overlays |
| \`↑\` \`↓\` | Move row focus on data tables |
| \`J\` / \`K\` | Next / previous **ticket** row (ticket list only) |
| \`Enter\` | Open the focused ticket |
| \`I\` | Assign the focused ticket to me (IT staff, ticket list) |
| \`Ctrl+[\` | Collapse or open the sidebar |
| \`Ctrl+C\` / \`Cmd+C\` | Copy the focused grid row as tab-separated values (for Excel) |
| ⧉ chip | Copy one code, ticket number, email, or URL, with a toast |

### Staff Chat

There is no dedicated keyboard shortcut for Chat. Super Admin, IT Admin, and IT Support use the **Chat** button in the header (or ⌘K → Chat). In the composer: **Enter** sends, **Shift+Enter** new line, **Ctrl+V** pastes a file or screenshot, \`@\` opens mentions.

> [!TIP]
> \`?\` always opens Help. The shortcuts overlay is **Ctrl+/** so those two jobs never share a key.`,
  },
  {
    id: 'employees-history',
    title: 'Employee History timeline',
    category: 'Employees',
    group: 'Lifecycle',
    summary: 'Every assignment, transfer, repair, and status change on one person.',
    keywords: ['history', 'timeline', 'offboard', 'assignment'],
    screenshot: '/docs/screenshots/employee-profile.png',
    body: `Open an employee → **History**.

The timeline is built from assignment, transfer, maintenance, and employment events — not a free-form journal. Each row has a when, a what, and usually an actor.

### What is working today

- Assign / transfer / return of assets appear here and on the asset show page.
- Offboard and reinstate write a History row and an audit-log row.
- Notes you add on the profile are **not** the History tab — they live in the Notes section (append-only).

> [!NOTE]
> History is read-only. To correct a past assignment, use Transfer / Return on the asset, or Manual correction (reason required) if the field itself was wrong.`,
  },
  {
    id: 'employees-offboarding',
    title: 'Offboarding and reinstating',
    category: 'Employees',
    group: 'Lifecycle',
    summary: 'Take a leaver out of pickers, recover kit, then optionally bring them back.',
    keywords: ['offboard', 'reinstate', 'inactive', 'leaver'],
    screenshot: '/docs/screenshots/employee-profile.png',
    body: `### Offboard

1. Open the employee profile (IT Admin+).
2. Optionally start an **offboard checklist** and tick each item (collect laptop, revoke access, …).
3. Click **Offboard**, add notes if useful, confirm.
4. The person becomes inactive: they disappear from assignment pickers, and their login is disabled. Assigned assets stay on the record until you return or transfer them — offboard does **not** auto-check-in kit.

### Reinstate

**Reinstate** flips them active again and re-enables the login. History is preserved.

> [!WARNING]
> Offboarding a person who still holds assets does not move those assets to Available. Clear the kit first (or immediately after) so the estate numbers stay honest.`,
  },
  {
    id: 'locations-departments',
    title: 'Locations & Departments',
    category: 'Locations & Departments',
    summary: 'Sites (Pune / Hyderabad / Bhopal) and the departments that sit under them.',
    keywords: ['locations', 'departments', 'office', 'city', 'PUN', 'HYD', 'BHO'],
    screenshot: '/docs/screenshots/locations.png',
    body: `**Locations** are physical sites. Seeded demo: Pune (\`PUN\`), Hyderabad (\`HYD\`), Bhopal (\`BHO\`). Each location has a code, name, city, and optional address.

**Departments** are org units (Finance, Engineering, …) managed under **Settings → Departments**. Employees and assets can both carry a department.

### How they relate

- Every **employee** must have a location (the Add employee form blocks save until at least one location exists).
- Every **asset** has a location; transfer can change it. The dashboard **Assets by location** table is one row per live Location record — city names are never hardcoded.
- Accessories and consumables are estate-wide stock, not per-location bins (there is no warehouse module).
- Asset codes often embed the location prefix (\`AST-PUN-LAP-0001\`) but the prefix is a naming convention, not a constraint the API re-validates on transfer.

### What is working today

1. **Locations** in the sidebar — Super Admin / IT Admin can create, edit, delete.
2. **Settings → Departments** — same roles, full CRUD.
3. Filters on Assets and Employees let you slice by location and department.
4. Reports include a Locations export.

> [!TIP]
> Add the three offices before importing employees. The import will fail rows that point at an unknown location code.`,
  },
  {
    id: 'settings',
    title: 'Settings',
    category: 'Settings',
    summary: 'Account, helpdesk mailbox, org data, imports, users, and webhooks.',
    keywords: ['settings', 'account', 'users', 'mailbox', 'categories', 'digest'],
    screenshot: '/docs/screenshots/settings.png',
    callouts: [
      { n: 1, label: 'Account tab' },
      { n: 2, label: 'Immediate vs Daily digest' },
      { n: 3, label: 'Your account card' },
    ],
    body: `Settings is a tabbed page. Which tabs you see depends on role. Open it from the sidebar (IT Admin / Super Admin) or the **account menu** (avatar) — Super Admin, IT Admin, **and IT Support**.

### Account (every role that can open Settings)

- Your name, email, role, and the raw permission tags the API granted you.
- **Ticket email notifications** (ticket staff only): Immediate vs Daily digest. In-app bell is always immediate.
- **Change password**.

### Helpdesk (Super Admin, IT Admin, IT Support)

Mailbox address, IMAP connection check, **canned responses / macros**. A canned reply can also set the ticket to **waiting on employee** or **resolved** when you send it. Local development without \`IMAP_HOST\` simply does not poll.

### IT Admin / Super Admin tabs

- **Categories** — LAP, MON, DES, … Delete is blocked while assets still use the category.
- **Departments** — org units used on employees and assets.
- **Import jobs** — upload, map columns, dry-run, commit, rollback. Files are capped at **500 MB**.
- **Reconciliation** — upload an HR/inventory CSV and see set-diff vs live records (manual upload only; no live AD/HR sync).
- **Webhooks** — \`asset.created\` / \`asset.status_changed\`, HMAC secret shown once.
- **Onboard / Offboard** — checklist templates used on employee profiles.
- **Issue kits** — named bundles (e.g. “New laptop kit”) of accessories to check out together when assigning.

Requisition **To/Cc** approvers are assigned on submit from the seeded **approval matrix** (amount/category rules), not from a picker on each PR form. Matrix rows are data (see API \`GET /api/vendor-contracts/approval-matrix\`); there is no dedicated matrix editor in Settings yet.

### Users (Super Admin only)

Create and disable logins, assign roles, reset passwords, link a user to an employee. This is the only place that can create an IT Admin or another Super Admin. There is no public self-service signup. See [Users & accounts](/help/users-accounts).

\`\`\`
# Typical local mailbox (does nothing until IMAP_HOST is set)
HELPDESK_MAILBOX=it@newvision.local
SMTP_HOST=
\`\`\`

> [!NOTE]
> Forgot-password and JWT refresh are implemented. Without SMTP / Resend, reset tokens are logged to the backend console.

### Troubleshooting

**IT Support cannot find Settings in the sidebar.**
Use the avatar menu → **Settings**. You will see Account + Helpdesk only.

**I changed a canned response and nothing happened on old tickets.**
Macros apply when you insert them on a reply. They do not rewrite history.`,
  },
  {
    id: 'users-accounts',
    title: 'Users & accounts',
    category: 'Settings',
    summary: 'Creating logins, the Users screen, password changes, and first-admin bootstrap.',
    keywords: ['users', 'login', 'password', 'bootstrap', 'reset'],
    screenshot: '/docs/screenshots/users.png',
    callouts: [
      { n: 1, label: 'Create user' },
      { n: 2, label: 'Role' },
      { n: 3, label: 'Active switch' },
    ],
    body: `A **user** is a login. An **employee** is a directory person. Most people have both, linked together. You can have a Super Admin with no employee row (bootstrap), and you can have employees with no login yet.

### Create a login (IT Admin)

On **Employees → Add / Edit**, tick **Create login** and pick Employee or Manager (IT Admin cannot create IT Admin / Super Admin logins).

### Users screen (Super Admin only)

**Settings → Users**:

1. **Create a login** — email, name, role, optional link to an employee. New logins are emailed a link to set their own password (or the token is logged to the console if mail is not configured).
2. **Active** switch — disable a login without deleting history.
3. **Reset password** — sets a new temporary password. Without mail transport, tell the person out of band (or read the console in local/dev).

This is the only UI that can create an **IT Admin** or another **Super Admin**.

### Change your own password

**Settings → Account → Change password** (IT Support: avatar → Settings).

### First admin on a blank database

Set \`SEED_MODE=bootstrap\` with \`BOOTSTRAP_ADMIN_EMAIL\` and \`BOOTSTRAP_ADMIN_PASSWORD\` (12+ characters). That creates roles + one Super Admin and does **not** load demo assets. After that, use Users / Employees as usual.

Forgot-password exists on the login page. JWT access tokens expire; the app refreshes the session while you stay signed in. If a mutation suddenly 401s, sign in again.

> [!WARNING]
> Disabling a login does not offboard the employee or return assets. Do both: Offboard + disable login + return kit.

### Troubleshooting

**Create login is missing.**
You are not IT Admin / Super Admin, or the person already has a user.

**I cannot create an IT Admin.**
Only Super Admin can, and only from Settings → Users.`,
  },
  {
    id: 'staff-chat',
    title: 'Team Chat',
    category: 'Team Chat',
    summary:
      'Staff chat workspace: own chrome (no admin sider), channels, DMs, threads, mentions, reactions, and live presence for Super Admin, IT Admin, and IT Support.',
    keywords: ['chat', 'dm', 'it-ops', 'unfurl', 'teams', 'thread', 'mention', 'reaction'],
    screenshot: '/docs/screenshots/chat.png',
    callouts: [
      { n: 1, label: 'Rail (Find + filters)' },
      { n: 2, label: 'Transcript + compose well' },
      { n: 3, label: 'Chat chrome (no admin sider)' },
    ],
    body: `The header **Chat** button (and the sidebar **Chat** item, from the console) open a **staff chat workspace** at \`/chat\`. Chat owns its own top bar — NewVision mark, conversation title, Details, and **Back to console**. The Assets / Tickets sider is not on this page. It is staff-only: **Super Admin, IT Admin, and IT Support**. Managers and Employees never see it, and the API rejects them with 403.

### Layout

1. **Left rail** — **All / Unread / Mentions** pills, an always-visible **Find** box (message search, not a modal), then channels (\`#it-ops\`, \`#helpdesk\`, \`#procurement\`, plus any you create) and chats. Channel rows use a \`#\` tile. Each row shows a preview, time, unread badge, and a **⋯** menu (Mute). People rows show initials and presence.
2. **Main pane** — a conversation header (\`# name\`, or a DM name plus **Available / Away / Busy / Offline** in colour and words), then the transcript, then a **bordered compose well**. Format, emoji, attach, and Send sit **inside** the well. Default density is Teams **Comfy** (your messages on the right). **Compact** (everything left, tighter) is a toggle on the chat bar and is remembered in this browser.
3. **Right panel** — a thread with the parent quote and close, or members/details from the **info** button. On a tablet (about 900px), the rail and the conversation are never stacked: you see the list **or** the transcript, and a thread replaces the transcript. Use the back chevron to return.

### What you can do

- **Channels** — public (any staff can join) or private (invite-only). Create, rename, set a topic, archive, add/remove people, leave. Seeded defaults: \`#it-ops\`, \`#helpdesk\`, \`#procurement\`.
- **Direct messages** — 1:1 with any other staff member. Opening the same pair reuses the existing chat.
- **Group chats** — ad-hoc rooms that are not formal channels.
- **Threads** — Reply on a message to keep the channel readable. The parent shows **N replies** and the last-reply time.
- **Rich text** — bold, italic, strikethrough, inline code, code blocks, lists, and auto-linked URLs from the composer toolbar.
- **@mentions** — type \`@\` to pick a person (stored as a real user id, not a display-name guess). \`@channel\` / \`@here\` notify everyone in that conversation (unless they muted it).
- **Emoji & reactions** — insert emoji in the composer; hover a message to react. Click a reaction to toggle yours.
- **Files & screenshots** — paperclip, drag-and-drop, or Ctrl+V. Explorer / Word copies that include a real Word/Excel/PowerPoint file attach the document, not the thumbnail. A Snipping Tool image still becomes a screenshot. Word text paste is cleaned. Executables are blocked. Images preview inline; other files show a card with type, name, and size.
- **Edit / delete** — edit in the bubble (Save / Cancel). Delete and Leave ask for confirmation. **Super Admin and IT Admin** may delete anyone’s message; both actions are audited.
- **Record cards** — drop \`TCK-…\`, \`AST-…\`, \`EMP-…\`, \`PO-…\`, or \`PR-…\` and Chat resolves it to a labelled card that opens the record. Unresolved codes fall back to search.
- **Unread** — per-conversation badges and the header Chat badge (from the console). Opening a conversation marks it read for **you** only. **Mark all read** does the same across your memberships. Each membership has All / Mentions only / Muted.
- **Presence & typing** — available (green circle), away (amber + clock), busy/DND (red + minus), offline (hollow). Colour is never the only signal. “X is typing…” while someone is composing. Updates go over a WebSocket, with HTTP as fallback if the socket drops (it reconnects and resyncs).
- **Search & deep links** — **Find** in the rail searches messages (\`GET /chat/search\`). Notification links to a conversation and message scroll there and flash the row. If you are reading older history, new traffic shows a **Jump to latest** pill instead of stealing the scroll.

### Notifications

Chat writes into the same bell as the rest of the app, with a **deep link** to the exact conversation and message (\`/chat?c=…&m=…\`, plus \`thread=\` when it is a reply):

| Event | Type |
|-------|------|
| New DM/group message, or a channel message (if you chose All) | \`chat_message\` |
| Someone @mentioned you, or used @channel/@here | \`chat_mention\` |
| A reply in a thread you already posted in | \`chat_thread_reply\` |

Muted conversations stay quiet. Mentions-only still delivers @mentions and thread replies you are in.

> [!TIP]
> Chat is **not** a ticket comment. Requesters never see it. Use it to ask “are you on TCK-000035?” before two people reply on the same ticket.

> [!NOTE]
> There are no calls, meetings, screen sharing, or guest (non-staff) accounts. Pin, bookmark, and forward are not built yet.

### Presence legend

Colour is never the only signal:

| Appearance | Meaning |
|------------|---------|
| Green circle | Available |
| Amber + clock | Away |
| Red + minus | Busy / do not disturb |
| Hollow | Offline |

### Troubleshooting

**I cannot see Chat.**
Only Super Admin, IT Admin, and IT Support. Managers and Employees are 403 at the API.

**Paste attached a thumbnail instead of the Word file.**
If Explorer / Word included a real document in the clipboard, Chat prefers the document. A Snipping Tool image still becomes a screenshot. \`.html\`, \`.svg\`, \`.jar\`, and executables are blocked.

**Presence stuck offline.**
The socket reconnects automatically. A hard refresh resyncs. Free-tier hosts that sleep will drop the socket until the API wakes.`,
  },
  {
    id: 'tips-troubleshooting',
    title: 'Tips & Troubleshooting',
    category: 'Tips & Troubleshooting',
    summary: 'Power-user habits and the problems people actually hit.',
    keywords: ['tips', 'troubleshoot', 'hidden gems', 'smtp', 'seed', 'scroll'],
    body: `### Hidden gems

- **⌘K** then type a code. Faster than opening the list and filtering.
- The quiet **⧉** chip copies \`TCK-\` / \`AST-\` / \`EMP-\` without selecting the text.
- **Ctrl+C** on a focused grid row copies the row as TSV — paste straight into Excel.
- Saved views on Assets (and tickets) remember filters you reuse.
- Duplicate an asset from the show page when you unbox a second identical laptop — you get a new code, not a clone of history.
- Print **20-up QR labels** from the Assets list instead of downloading one PNG at a time.
- Copy-email on a ticket builds an Outlook-ready draft. It does **not** send mail and does **not** add a public comment unless you paste/send yourself.
- **I** on the ticket list assigns the focused row to you.
- Paste \`TCK-…\` / \`AST-…\` into Chat for a clickable record card.
- **Issue kits** (Settings) checkout a charger + bag with the laptop in one Assign.
- Public scan never shows the assignee — photograph a sticker safely.

### Common problems

**I signed in as Employee and I do not see Dashboard / Settings.**
That is correct. Employees land on **My IT**. They can raise a ticket, request a device, and see their own assets.

**Why can't I see this menu item?**
Role. See [Roles & Permissions](/help/roles). Chat, Vendors, Import, Users, and Audit are the usual surprises.

**Why is this asset still assigned?**
Return / Transfer was not run. Offboarding a person does not auto-free kit.

**Warranty attention used to mix thousand-day-expired laptops with upcoming ones.**
The warranty API and Assets **Warranty** chip now split **expiring soon** (14/30/90 days) from **already expired**. The dashboard **Expiring (14d)** link opens the near-term work list.

**A ticket used to say Not started while already In progress.**
The timeline now treats \`assigned\` / \`in_progress\` / \`waiting_on_employee\` (and later states) as evidence work has started, and backfills a “Work started” point from \`updatedAt\` when no assign/status audit exists.

**Email never arrived.**
Without \`SMTP_HOST\` / \`RESEND_API_KEY\` the backend logs the message to the console and the API still succeeds. Check the Nest terminal, not the user’s inbox. Staff on Daily digest will not get per-event mail.

**Email-in did nothing.**
IMAP is only polled when mailbox env vars are set. Settings → Helpdesk shows connection status. Local default is “not polling”.

**Restarting Docker wiped my demo edits.**
Compose defaults to \`SEED_ON_START=true\`. Set it to \`false\` after the first boot if you want data to persist.

**Two scrollbars on a list.**
The page and the grid each have a scrollbar. Use the grid’s thicker bar to move columns; the page bar moves the chrome.

**IT Support cannot find digest preference.**
Avatar menu → **Settings** → Account. There is no Settings item in their sidebar.

> [!WARNING]
> Do not put real employee names or serial numbers on a printed QR sticker. The public scan URL is reachable by anyone with the photo.`,
  },
];

export function findArticle(id: string): HelpArticle | undefined {
  return helpArticles.find((a) => a.id === id);
}

export function searchArticles(q: string): HelpArticle[] {
  const s = q.trim().toLowerCase();
  if (!s) return helpArticles;
  return helpArticles.filter(
    (a) =>
      a.title.toLowerCase().includes(s) ||
      a.summary.toLowerCase().includes(s) ||
      a.keywords.some((k) => k.includes(s)) ||
      a.body.toLowerCase().includes(s),
  );
}
