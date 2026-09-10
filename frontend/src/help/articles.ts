export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  keywords: string[];
  screenshot?: string;
  callouts?: { n: number; label: string }[];
  body: string;
}

export const HELP_CATEGORIES = [
  'Getting Started',
  'Assets',
  'Accessories & Consumables',
  'People & Locations',
  'Operations',
  'Support tickets',
  'Governance',
  'Reference',
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

Press **/** anywhere to focus global search. Press **?** in the header to return to Help.`,
  },
  {
    id: 'dashboard',
    title: 'Dashboard & Analytics',
    category: 'Operations',
    summary: 'KPI cards, status donut, location bars, growth chart, warranty table, and needs-attention alerts.',
    keywords: ['dashboard', 'status', 'metrics', 'warranty', 'attention', 'charts'],
    screenshot: '/docs/screenshots/dashboard.png',
    callouts: [
      { n: 1, label: 'Metric cards' },
      { n: 2, label: 'Needs attention' },
      { n: 3, label: 'Status donut' },
      { n: 4, label: 'Warranty table' },
    ],
    body: `The **Dashboard** shows fleet health at a glance.

- **Metric cards** — Total, Assigned, Available, Under Repair, Retired, Warranty ≤90d. Click a card to open the assets list pre-filtered.
- **Needs attention** — warranty, stale repairs, low stock, and requests awaiting fulfillment. Use **Dismiss all** to hide the panel for this browser session.
- **Charts** — status donut with legend, per-location stacked bar, and 12-month growth. Use **Last 12 months** / **All locations** to scope the view.
- **Warranty expiring** — DataGrid sorted by urgency; open an asset or jump to the filtered Assets list.

Click any attention item to jump to the relevant screen.`,
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
- **/** focuses the grid filter; **↑↓** moves row focus; **Ctrl+C** copies the focused row as tab-separated text

Use copy icons beside asset codes and serial numbers to copy individual values.`,
  },
  {
    id: 'assets-assign-transfer',
    title: 'Assigning & Transferring Assets',
    category: 'Assets',
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

**Retire** moves asset to \`retired\` (requires reason). Only \`retired\` assets can reach \`disposed\`.`,
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
- **Open scan page** — public mobile-friendly view (no login): status, item, serial, location, assignee, warranty days. Cost and history are omitted by design.`,
  },
  {
    id: 'accessories-consumables',
    title: 'Accessories & Consumables',
    category: 'Accessories & Consumables',
    summary: 'Non-serialized peripherals and depletable stock.',
    keywords: ['accessories', 'consumables', 'checkout', 'issue', 'stock'],
    screenshot: '/docs/screenshots/accessories.png',
    body: `**Accessories** (mice, chargers, docks) track \`quantity_total\` vs \`quantity_checked_out\`. IT Admin checks out to employees and checks in when returned.

**Consumables** (toner, cables, batteries) track \`quantity_available\`. **Issue** decrements stock. When quantity falls below \`low_stock_threshold\`, a notification fires and the item appears on the dashboard attention panel.

Both modules use the same Excel-grade grid as Assets.`,
  },
  {
    id: 'employees',
    title: 'Employees & Profiles',
    category: 'People & Locations',
    summary: 'Employee directory and profile with assigned assets.',
    keywords: ['employees', 'profile', 'manager'],
    screenshot: '/docs/screenshots/employee-profile.png',
    body: `**Employees** lists all staff with search by name, code, or email. Click a row for the **profile** page showing:

- Assigned serialized assets with status and warranty
- Accessory checkouts
- Consumable issues

Managers viewing profiles see **direct reports only** (API-enforced).`,
  },
  {
    id: 'maintenance',
    title: 'Maintenance & Repairs',
    category: 'Operations',
    summary: 'Report issues, repair queue, vendor and cost tracking.',
    keywords: ['maintenance', 'repair', 'issue', 'vendor'],
    screenshot: '/docs/screenshots/maintenance.png',
    body: `Repair lifecycle: \`reported → under_repair → repaired → reassigned\` (or \`cancelled\`).

- **Employees** report issues only on assets assigned to them.
- **IT Support/Admin** manage the queue: Start Repair, Mark Repaired (enter actual cost), Reassign, Cancel.
- Asset status is coupled — starting repair sets asset to \`under_repair\`; reassignment returns it to \`assigned\` or \`available\`.`,
  },
  {
    id: 'warranty',
    title: 'Warranty Tracking',
    category: 'Operations',
    summary: 'Warranty dates, expiry alerts, dashboard panel.',
    keywords: ['warranty', 'expiry', 'alert', 'email'],
    body: `Assets store \`warranty_start\` and \`warranty_end\`. The dashboard lists assets expiring within 90 days, sorted by days remaining.

A daily cron creates de-duplicated notifications at **90, 60, and 30 days** before expiry and emails IT Admins (SMTP when configured, console log otherwise).`,
  },
  {
    id: 'reports',
    title: 'Reports',
    category: 'Operations',
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
    category: 'Governance',
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

**Assets** list **Export** respects active filters. Empty result returns an error (prevents accidental full dumps).`,
  },
  {
    id: 'requests',
    title: 'Asset Requests',
    category: 'Operations',
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
    body: `Use **Support Tickets** for software, network, access, or general issues. Hardware repairs on a known asset still go through **Maintenance**; asking for a new laptop still goes through **Requests**.

1. **Open Raise a ticket** from the Support Tickets list.
2. **Optionally pick a template** such as “Can't connect to VPN” or “Password reset”.
3. **Choose a category** — Access & Account defaults to High; General defaults to Low. You can still change priority.
4. **Add watchers** if a manager or colleague should be notified.
5. **Submit** — you receive a ticket number like \`TCK-000123\` (copy icon next to it).

IT Support is auto-assigned when someone is available; otherwise the ticket stays Open for the queue.`,
  },
  {
    id: 'tickets-statuses',
    title: 'Understanding ticket statuses',
    category: 'Support tickets',
    summary: 'Open, assigned, in progress, resolved, closed, and reopened.',
    keywords: ['status', 'lifecycle', 'reopen', 'overdue'],
    screenshot: '/docs/screenshots/tickets.png',
    callouts: [
      { n: 1, label: 'Status chips' },
      { n: 2, label: 'Overdue flag' },
    ],
    body: `Lifecycle: \`open → assigned → in_progress → resolved → closed\`. **Reopened** returns the ticket to assigned/in progress.

- **Overdue** is a visual flag against an optional due date. There is no automatic escalation.
- **Resolved** is when IT believes the work is done — that is when you are asked to rate the resolution.
- **Closed** is the final state. Reopen if the issue returns.`,
  },
  {
    id: 'tickets-comments-watchers',
    title: 'Comments and watchers',
    category: 'Support tickets',
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
2. **Assign** from the ticket or in bulk from the list.
3. **Insert a canned response** before sending a reply (Settings → Helpdesk).
4. **Log time** in minutes; the running total appears on the ticket and in reports.
5. **Reports** show volume by status/category/priority, average resolution time, overdue open tickets, closed counts per staff member, and average satisfaction.

Managers see their own tickets plus direct reports. They cannot assign, add internal notes, or log time.`,
  },
  {
    id: 'tickets-rating',
    title: 'Rating a resolved ticket',
    category: 'Support tickets',
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
    category: 'Governance',
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

This does not bypass field validation (unknown statuses or missing employees are still rejected). There is no bulk manual-edit tool and no way to edit or delete an audit row.`,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    category: 'Operations',
    summary: 'Bell icon, unread count, mark as read.',
    keywords: ['notifications', 'bell', 'alert'],
    screenshot: '/docs/screenshots/notifications.png',
    body: `The header **bell** shows unread notifications: warranty alerts, repair updates, low stock, request events, assignments.

Open the dropdown to read items. Bulk **Mark all read** is available when notifications are selected in the grid (where shown).`,
  },
  {
    id: 'audit',
    title: 'Audit Log',
    category: 'Governance',
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
    summary: 'Five roles and what each can do at the API layer.',
    keywords: ['roles', 'rbac', 'permissions', 'security'],
    body: `Permissions are enforced on the API; the UI hides unauthorized actions.

- **SUPER_ADMIN** — all permissions including \`user:manage\`, \`audit:read\`, asset delete
- **IT_ADMIN** — full asset lifecycle, org CRUD, maintenance, import/export, audit read, fulfill requests
- **IT_SUPPORT** — read assets/employees, manage maintenance, run reports, manage support tickets
- **MANAGER** — read assets/employees, \`request:approve\`, reports; own + direct-report support tickets
- **EMPLOYEE** — read assets (scoped), \`issue:report\`, \`asset:request\`, raise/view own support tickets

View your permissions under **Settings → Account**.`,
  },
  {
    id: 'qr-webhooks',
    title: 'QR Codes & Webhooks',
    category: 'Governance',
    summary: 'Physical audit stickers and outbound event hooks.',
    keywords: ['qr', 'webhook', 'scan', 'integration'],
    body: `**QR** — per-asset PNG; encodes public scan URL. **Webhooks** (Settings) subscribe to \`asset.created\` and \`asset.status_changed\` with HMAC-SHA256 signatures. Secret shown once on create.`,
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    category: 'Reference',
    summary: 'All keyboard shortcuts across NewVision.',
    keywords: ['keyboard', 'shortcuts', 'hotkeys'],
    body: `| Shortcut | Action |
|----------|--------|
| \`/\` | Focus global search (or grid filter when on a table page) |
| \`Esc\` | Clear row focus / close expanded rows |
| \`↑\` \`↓\` | Move row focus on data tables |
| \`Ctrl+C\` / \`Cmd+C\` | Copy focused row as tab-separated values |
| Copy icon | Copy individual codes, IDs, emails, URLs with toast confirmation |`,
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
