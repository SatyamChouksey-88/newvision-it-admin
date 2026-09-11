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
  'Getting Started',
  'Assets',
  'Employees',
  'Locations & Departments',
  'Accessories & Consumables',
  'Maintenance',
  'Support tickets',
  'Requests',
  'Reports & Analytics',
  'Import & Reconciliation',
  'Notifications',
  'Settings',
  'Reference',
  'Tips & Troubleshooting',
] as const;

export const helpArticles: HelpArticle[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    category: 'Getting Started',
    summary: 'First login, roles, and initial setup for a new IT admin.',
    keywords: ['login', 'roles', 'setup', 'password', 'onboarding'],
    screenshot: '/docs/screenshots/login.png',
    callouts: [
      { n: 1, label: 'Email field' },
      { n: 2, label: 'Sign in button' },
    ],
    body: `## Welcome to NewVision

NewVision replaces spreadsheet-based IT inventory tracking for ~1,250 assets across Pune, Hyderabad, and Bhopal.

### Demo logins

All seeded accounts use password **Password123!**:

| Role | Email | Typical use |
|------|-------|-------------|
| Super Admin | superadmin@newvision.local | Full access including user management |
| IT Admin | itadmin@newvision.local | Day-to-day asset operations |
| IT Support | support@newvision.local | Maintenance queue |
| Manager | manager@newvision.local | Approve employee requests |
| Employee | employee@newvision.local | View own assets, submit requests |

### First steps for a new admin

**Empty database (migrate only, no seed):** the Dashboard shows a **Welcome to NewVision** card with four setup steps — locations, categories, employees, then assets. That card is hidden when the demo seed has already populated the estate.

**Seeded demo:**

1. **Locations** — confirm Pune (PUN), Hyderabad (HYD), Bhopal (BHO) exist under **Locations**.
2. **Categories** — **Settings → Categories** to add LAP, MON, DES, etc. Seeded databases already have these.
3. **Import** — **Settings → Import jobs** upload a CSV/XLSX of assets or employees.
4. **Assign** — open **Assets**, pick an available asset, click **Assign**.

Press **/** anywhere to focus global search.

> [!TIP]
> Press **⌘K** / **Ctrl+K** to open the command palette from anywhere in the app — it jumps straight to a screen or a record by typing its code (e.g. \`TCK-000123\`).`,
  },
  {
    id: 'dashboard',
    title: 'Dashboard & Analytics',
    category: 'Reports & Analytics',
    summary: 'Role-specific homes, KPI tiles, status and location tables, ticket summary, and needs-attention alerts.',
    keywords: ['dashboard', 'status', 'metrics', 'warranty', 'attention', 'tables'],
    screenshot: '/docs/screenshots/dashboard.png',
    callouts: [
      { n: 1, label: 'Metric cards' },
      { n: 2, label: 'Needs attention' },
      { n: 3, label: 'Status table' },
      { n: 4, label: 'Ticket summary' },
    ],
    body: `Home depends on your role — Super Admin and IT Admin see the estate console; IT Support sees an operational queue; Managers see team work; Employees see **My IT**.

### IT console (Super Admin / IT Admin)

- **Metric cards** — Total, Assigned, Available, Under Repair, Retired, Open tickets. Click a card to open the matching list.
- **Support tickets** — Today / Yesterday / Tomorrow / date range counts. Warranty expiry stays under Needs attention.
- **Status table** — one coloured row per status (tag, count, share). Click a row to filter Assets.
- **Assets by location** — one row per office (from live Location records, never hardcoded city names). Each status is its own coloured column. Click a count to filter.
- There is **no Growth chart**. Estate size is the Total KPI.
- **Needs attention** — warranty, stale repairs, low stock, and requests awaiting fulfillment.

### Other homes

- **IT Support** — unassigned tickets, stale repairs, items assigned to you.
- **Manager** — requests waiting on you, team tickets, team devices.
- **Employee (My IT)** — your assigned devices, a Raise a ticket / Request a device action, and your open tickets.`,
  },
  {
    id: 'assets-overview',
    title: 'Assets — Overview',
    category: 'Assets',
    summary: 'List, filter, export, and lifecycle actions for serialized assets.',
    keywords: ['assets', 'list', 'filter', 'export', 'assign'],
    screenshot: '/docs/screenshots/assets-list.png',
    body: `**Assets** is the core inventory. Each asset has a unique \`assetCode\` (e.g. AST-PUN-LAP-0001) and optional serial number.

### List features (Excel-grade grid)

- Sort any column by clicking the header
- **Columns** button — show/hide and drag headers to reorder
- Drag column borders to resize
- **Filter rows** box — quick client filter; page filters still apply for server data
- **Export CSV** — exports visible columns and current quick-filter results
- **Compact / Comfortable** density toggle
- Select rows for bulk status change, transfer, or retire (IT Admin+)
- **/** focuses the grid filter; **↑↓** moves row focus; **Ctrl+C** copies the selected row as tab-separated text for Excel (hint is also on the table toolbar)

A quiet **⧉** chip copies a single field (asset code, ticket number). That is not the same as **Duplicate** on the asset detail page, which creates a new record with a fresh code.`,
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
    summary: 'Change status, transfer, or retire many selected assets at once.',
    keywords: ['bulk', 'select', 'retire', 'transfer', 'status'],
    screenshot: '/docs/screenshots/assets-list.png',
    body: `On **Assets**, tick one or more rows. The toolbar then shows **Bulk status**, **Bulk transfer**, and **Bulk retire**.

### What is working today

1. Select rows (header checkbox selects the current page).
2. Pick the action. Transfer asks for a location (and optional assignee). Retire asks for a reason.
3. The API applies the change per id and returns succeeded/failed counts. A row that is not eligible (already retired, invalid transition) is reported, not silently skipped without a count.

There is **no bulk assign** yet — assign is still one asset (plus optional accessories) at a time.

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
> Do not put names or serials on the printed sticker. The QR only needs the asset code.`
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

Mice, chargers, docks, headsets. Each SKU has \`quantity_total\` vs \`quantity_checked_out\`.

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

> [!TIP]
> If IT is handing a laptop *and* a charger together, use Assign on the laptop and tick the charger in the same modal. That is one history event, not two screens.`
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
- Click a row for the **profile**: identity, location/department, assigned assets, accessories checked out, consumables issued, notes, and the **History** tab.
- **Add employee** (IT Admin+) can optionally **create a login** in the same save — pick a role (usually Employee). Super Admin can also create users from Settings → Users.
- **Onboard / offboard checklists** start from the profile. Templates are edited in Settings → Onboard / Offboard.
- Managers viewing the list or profiles see **direct reports only** (API-enforced).

### Creating a login for an employee

1. Open **Employees → Add employee** (or edit an existing person who has no user).
2. Tick **Create login** and choose a role.
3. They sign in with their work email. Super Admin can reset or disable the account later under Settings → Users.

> [!NOTE]
> There is no self-service “first Super Admin” wizard. The first admin comes from seed or a Super Admin creating the user.`
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
- The dashboard **Needs attention** card for stale repairs currently opens the unfiltered Maintenance list. Filter the list yourself to \`under_repair\` until the deep-link ships.

> [!NOTE]
> Maintenance and Support Tickets are not linked yet. If the same incident exists in both places, keep the ticket numbers in a note on each record.`
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
- Warranties that expire within **7 days** still appear under **Needs attention**, with a link to the **Expiring (14d)** Assets filter.
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

Requires \`report:run\` permission (IT Admin, IT Support, Manager, Super Admin).`,
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
> An export with zero matching rows returns an error instead of a silent full-estate dump — this guards against accidentally exporting everyone's data when a filter typo matched nothing.`,
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

Statuses: \`pending → approved|rejected → fulfilled\`.`,
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

Staff can **@mention** colleagues on the ticket, copy a ready **email draft** (mail icon) to paste into Outlook, and — for Super Admin / IT Admin / IT Support only — use the header **Chat** launcher (#it-ops plus 1:1 DMs). Pasting a ticket number like \`TCK-000123\` in chat becomes a clickable preview.`
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
- **Closed** is the final state. A requester comment on a resolved/closed ticket reopens it.`,
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
      { n: 1, label: 'Public vs internal' },
      { n: 2, label: 'Watchers' },
    ],
    body: `1. **Public replies** are visible to the requester and watchers.
2. **Internal notes** (IT staff only) stay on the staff thread.
3. **Watchers** get the same notifications as the requester. Add a manager or the colleague who reported the issue.

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
4. **Insert a canned response** before sending a reply (Settings → Helpdesk).
5. **Log time** in minutes; the running total appears on the ticket and in reports.
6. **Reports** show volume by status/category/priority, average resolution time, overdue open tickets, closed counts per staff member, and average satisfaction.

Managers see their own tickets plus direct reports. They cannot assign, add internal notes, or log time.

Quick views include **Email-in** for tickets that arrived by mail. The ticket shows a Portal vs Email channel chip.`,
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

Settings → Helpdesk shows mailbox status and a connection check. Local development without IMAP simply does not poll.`,
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
    summary: 'Append-only notes on records, and a reason-required override for Super Admin / IT Admin.',
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
> Manual correction does not bypass field validation — an unknown status or a missing employee is still rejected. There is no bulk manual-edit tool, and no way to edit or delete an audit row once written.`,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    category: 'Notifications',
    summary: 'Bell icon, ticket email vs digest, and staff-chat alerts.',
    keywords: ['notifications', 'bell', 'alert', 'chat', 'digest'],
    screenshot: '/docs/screenshots/notifications.png',
    body: `## In-app bell

The header **bell** shows unread notifications for the signed-in user:

- Warranty threshold days (90 / 60 / 30)
- Asset assigned / transferred
- Repair reported and status changes
- Low stock
- Asset requests
- Support-ticket events (create, assign, comment, status, @mention)
- Staff chat messages (\`chat_message\`) when someone posts in a channel you belong to and you are not looking at it

## Email

Ticket mail is branded HTML with \`[TCK-000123]\` in the subject and a Reply-To of the helpdesk mailbox. Without \`SMTP_HOST\`, the backend **logs the message to the console** — it does not fail the API.

IT staff can pick **Immediate** vs **Daily digest** under Settings → Account (IT Support currently has no Settings nav — use the Account path once it is exposed on Queue, or ask a Super Admin).

Requesters and watchers always get immediate ticket email when SMTP is configured.

> [!TIP]
> Use the mail icon on a ticket to **copy a ready Outlook draft**. That does not send mail; it is a paste helper.`,
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
| Estate dashboard / metrics | Yes | Yes | Queue home | Team home | My IT |
| Assets create / assign / transfer / retire | Yes | Yes | Read | Read (scoped) | Own assigned |
| Locations / categories / departments | Yes | Yes | Read | Read | No |
| Employees create / offboard / login | Yes | Yes | Read | Direct reports | Own profile |
| Maintenance queue | Yes | Yes | Yes | Report only | Report own asset |
| Support tickets (all) | Yes | Yes | Yes | Own + reports | Own only |
| Internal notes / assign tickets | Yes | Yes | Yes | No | No |
| Requests approve | Yes | Yes | No | Yes (team) | Submit only |
| Fulfill requests | Yes | Yes | No | No | No |
| Reports | Yes | Yes | Yes | Yes | No |
| Import / reconcile / webhooks | Yes | Yes | No | No | No |
| Settings → Users | Yes | No | No | No | No |
| Audit log | Yes | Yes | No | No | No |
| Staff chat | Yes | Yes | Yes | No | No |

View **your** permission tags under **Settings → Account**.

> [!NOTE]
> IT Support has no Settings item in the sidebar today, so they cannot reach the Account digest radio unless a Super Admin opens Settings for them or a later change adds an Account entry on Queue.`
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
> Do not print names or serials on the sticker. The QR only needs the asset code.`
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts & Command Palette',
    category: 'Reference',
    summary: 'Every shortcut, ⌘K jump, and the ? Help key.',
    keywords: ['keyboard', 'shortcuts', 'hotkeys', 'command palette', 'ctrl+k'],
    body: `### Command palette

Press **⌘K** / **Ctrl+K** anywhere in the signed-in app. Type a screen name or a record code (\`AST-…\`, \`EMP-…\`, \`TCK-…\`). Arrow keys move the highlight; Enter opens it.

The palette currently lists the same destinations for every role. An Employee will still see “New asset” or “Audit Log” in the list — the destination then 403s or hides the action. Role-filtering is not built yet.

### App shortcuts

| Shortcut | Action |
|----------|--------|
| \`⌘K\` / \`Ctrl+K\` | Open the command palette (or docs search when you are already in Help) |
| \`?\` | Open Help (ignored while typing in an input) |
| \`/\` | Focus the grid filter on a table page |
| \`Esc\` | Clear row focus / close expanded rows |
| \`↑\` \`↓\` | Move row focus on data tables |
| \`Ctrl+C\` / \`Cmd+C\` | Copy the focused row as tab-separated values (for Excel) |
| ⧉ chip | Copy one code, ticket number, email, or URL, with a toast |

### Staff Chat

There is no keyboard shortcut for Chat. Super Admin, IT Admin, and IT Support use the **Chat** button in the header (#it-ops plus 1:1 DMs). Ticket numbers pasted in a message become clickable previews.

> [!TIP]
> \`?\` opens Help. Do not reuse \`?\` for a shortcuts overlay — that key is already taken.`
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
      { n: 1, label: 'Account (every signed-in user who can open Settings)' },
      { n: 2, label: 'Helpdesk mailbox status' },
      { n: 3, label: 'Users (Super Admin only)' },
    ],
    body: `Settings is a tabbed page. Which tabs you see depends on role.

### Account (IT Admin, Super Admin, and IT Support if they can open the page)

- Your name, email, role, and the raw permission tags the API granted you.
- **Ticket email notifications**: Immediate vs Daily digest (ticket staff only).
- **Change password**.

IT Support currently has **no Settings item in the sidebar**, so they cannot reach this tab from navigation. That is a known gap.

### Helpdesk (ticket staff)

Mailbox address, IMAP connection check, canned responses. Local development without \`IMAP_HOST\` simply does not poll. Inbound mail is not “proven” until a real mailbox is configured.

### IT Admin / Super Admin tabs

- **Categories** — LAP, MON, DES, … Delete is blocked while assets still use the category.
- **Departments** — org units used on employees and assets.
- **Import jobs** — upload, map columns, dry-run, commit, rollback.
- **Reconciliation** — upload an HR/inventory CSV and see set-diff vs live records.
- **Webhooks** — \`asset.created\` / \`asset.status_changed\`, HMAC secret shown once.
- **Onboard / Offboard** — checklist templates used on employee profiles.

### Users (Super Admin only)

Create and disable logins, assign roles. This is the only place that can create an IT Admin. There is no public self-service signup.

\`\`\`
# Typical local mailbox (does nothing until IMAP_HOST is set)
HELPDESK_MAILBOX=it@newvision.local
SMTP_HOST=
\`\`\`

> [!NOTE]
> Forgot-password and JWT refresh are implemented. Without SMTP, reset tokens are logged to the backend console.`,
  },
  {
    id: 'staff-chat',
    title: 'Staff chat',
    category: 'Support tickets',
    group: 'For IT staff',
    summary: '#it-ops and 1:1 DMs for Super Admin, IT Admin, and IT Support.',
    keywords: ['chat', 'dm', 'it-ops', 'unfurl'],
    screenshot: '/docs/screenshots/chat.png',
    body: `The header **Chat** button is staff-only (\`SUPER_ADMIN\`, \`IT_ADMIN\`, \`IT_SUPPORT\`). Managers and Employees never see it.

### What is working today

- **#it-ops** group channel, plus 1:1 DMs with other staff.
- Messages poll every few seconds (same idea as notifications — no WebSocket).
- Unread badge on the Chat button; \`chat_message\` also lands in the bell if you are not looking at the channel.
- Paste \`TCK-000123\` (or an asset/employee code) and the message shows a clickable preview card.
- Chat is **not** a ticket comment. Requesters never see it.

> [!TIP]
> Use Chat to ask a colleague “are you on TCK-000035?” before two people reply on the same ticket. There is no live “someone else is viewing this ticket” indicator yet.`,
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

### Common problems

**I signed in as Employee and I do not see Dashboard / Settings.**
That is correct. Employees land on **My IT**. They can raise a ticket, request a device, and see their own assets.

**Warranty attention used to mix thousand-day-expired laptops with upcoming ones.**
The warranty API and Assets **Warranty** chip now split **expiring soon** (14/30/90 days) from **already expired**. The dashboard **Expiring (14d)** link opens the near-term work list.

**A ticket used to say Not started while already In progress.**
The timeline now treats \`assigned\` / \`in_progress\` / \`waiting_on_employee\` (and later states) as evidence work has started, and backfills a “Work started” point from \`updatedAt\` when no assign/status audit exists.

**Email never arrived.**
Without \`SMTP_HOST\` the backend logs the message to the console and the API still succeeds. Check the Nest terminal, not the user’s inbox.

**Email-in did nothing.**
IMAP is only polled when mailbox env vars are set. Settings → Helpdesk shows connection status. Local default is “not polling”.

**Restarting Docker wiped my demo edits.**
Compose defaults to \`SEED_ON_START=true\`. Set it to \`false\` after the first boot if you want data to persist.

**Two scrollbars on a list.**
The page and the grid each have a scrollbar. Use the grid’s thicker bar to move columns; the page bar moves the chrome.

**IT Support cannot change digest preference.**
They have no Settings nav item. Ask a Super Admin, or wait for an Account entry on Queue.

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
