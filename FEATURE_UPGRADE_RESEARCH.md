# NewVision — Feature upgrade research (joining, hardware, sticky chrome, mobile)

**Date:** 14 Sep 2026. Prompt 38 implemented what this file planned; see **§K** for shipped vs still-out.  
**Sawal yeh file jawab deti hai:** aapke 5 points aaj ke source mein kahan toot’te hain, industry kya karti hai, aur **chhoti lekin roz-roz ki** cheezein kya add karni chahiye.

**Sister pack (security / email / GST / GTM yahan repeat nahi):** [`NEWVISION_RESEARCH_PACK.md`](./NEWVISION_RESEARCH_PACK.md).  
**Pehle se standing non-goal:** [`FUTURE_IDEAS.md`](./FUTURE_IDEAS.md) mein “phone-width admin rewrite” likha hai. Point 5 usko **explicit product decision** se badalta hai — yeh file phone ko *usable* banane ka plan hai, poora admin phone-first nahi.

---

## 0. Short Hindi brief

| # | Aapne kaha | Aaj kya hai | Seedha matlab |
|---|------------|-------------|----------------|
| 1 | Employee join pe joining date | DB field `dateJoined` **hai**. Add-employee form, list, profile, types **nahi dikhate**. Create pe `null` save hota hai. | Field banana nahi — **UI + required + list column**. Uske saath probation / last working day. |
| 2 | Assets mein sirf laptop; mouse, headphone, monitor nahi | **Monitor already Asset** (`MON`). Mouse / headset / charger **Accessories** page pe hain (qty pool, serial nahi). Employee **My devices** sirf serialized assets dikhata hai. | Do alag drawers. User Assets kholta hai → laptop/desktop/phone dikhta hai. Peripheral **Accessories** nav pe chhupa hai. |
| 3 | Accessories ko bhi laptop jaisa serial, warranty, code | Design decision (`DECISIONS.md`): accessories **qty**, assets **serial**. Snipe-IT bhi yahi kehta hai: serial chahiye to **Asset category** banao, Accessory table ko Asset mat banao. | Teen bucket: serialized / reusable qty / consumed. Serial wale mouse = naya Asset category. Cable = Accessory. |
| 4 | Scroll pe upar ka section rigid | App **Header** (52px) sticky hai. Page title (Card “Assets”), filter row, grid toolbar **sticky nahi**. `DataGrid` comment kehta hai sticky default true — code mein **`sticky = false`**, koi list `sticky={true}` pass nahi karti. | CSS bug + flag off. Fix: page chrome + table header `offsetHeader`. |
| 5 | Live site mobile pe theek nahi | Tablet (≥768, &lt;1024) sider collapse + hamburger **hai**. Phone (390) e2e **sirf public `/scan`**. Admin tables `scroll.x: 1400`. Employee cards theek-thaak. IT Admin list phone pe toot’ti hai. | Employee + scan usable; **IT console phone pe usable nahi**. Card-list + sticky filters, poora rewrite nahi. |

**Pehle yeh 8 chhote kaam** (bade ITSM module se zyada value):

1. Joining date required + list/profile/import already wired.  
2. Hardware home: tabs **Serialized | Accessories | Consumables**.  
3. Employee My IT / My devices pe checked-out accessories.  
4. Onboard checklist: laptop **+ charger + mouse + headset**.  
5. Sticky page bar (title + filters) under 52px header; table `sticky={{ offsetHeader }}`.  
6. Phone: Employee/My IT card layout; IT lists → stacked cards under 640px.  
7. Accessory: brand, model, location on create, low-stock number (consumable jaisa).  
8. Decision chip on create: “Does this unit have its own serial?” → Asset vs Accessory.

---

## How this was grounded

- Current Prisma (`Employee.dateJoined`, `Asset` vs `Accessory`), Nest DTOs/services, Refine pages (`CreateEmployeeModal`, `assets/list`, `accessories/list`, `dashboard` My IT, `DataGrid`, `Header`, `index.css`, `access.ts` nav).  
- In-repo decisions: accessories are **not** serialized (`DECISIONS.md`, `PROJECT_DOCUMENTATION.md`).  
- Comparable tools: [Snipe-IT accessories](https://mintlify.wiki/grokability/snipe-it/features/accessories) — qty, no per-unit serial; serial = Assets. [Snipe-IT #2934](https://github.com/grokability/snipe-it/issues/2934) — maintainers: “just track it as an asset.”  
- India IT join: joining date, reporting manager, 3–6 month probation, last working day, Day-1 laptop + signed acknowledgement ([IT for SME checklist](https://www.itforsme.in/resources/templates/employee-it-onboarding-checklist-india), [Wisemonk India onboarding](https://www.wisemonk.io/blogs/employee-onboarding-checklist-in-india)). **PAN/Aadhaar/PF is HRIS — NewVision ITAM nahi.**  
- Ant Design Table: `sticky` / `{ offsetHeader, getContainer }` ([docs](https://ant.design/components/table/)). Native `position: sticky` fails if a parent has `overflow` other than visible.

---

## A. Employee join — joining date and the rest of Day 1

### A.1 What already exists (hidden)

| Layer | `dateJoined` |
|-------|----------------|
| Prisma `Employee` | `DateTime?` mapped `date_joined` — **optional, no DB default** |
| `CreateEmployeeDto` / update / import CSV | Field accepted (`dateJoined`) |
| Seed | Random last 30–2000 days |
| **Frontend `types.ts`** | **Missing** |
| **Add employee modal** | **Missing** — POST body mein date nahi, backend `null` likhta hai |
| Employee list columns | Code, email, designation, location, dept, status — **no join date, no tenure** |
| Profile `Descriptions` | Email, phone, dept, location, status, **contract end** — **no join date** |
| Manual edit fields | Name / email / phone / designation only |
| Offboard | `isActive: false` + return assets. **No last working day.** |

`createdAt` **joining date nahi hai.** Woh row insert ka waqt hai (IT ne kab system mein daala). Offer letter ki date alag ho sakti hai.

`employmentType` sirf `permanent | contract`. Intern / consultant / trainee nahi. `managerId` API pe hai, create modal pe **nahi**.

Onboard checklist default (`checklists.controller.ts`): **Issue laptop, Create login, VPN / MFA, ID badge.** Mouse, charger, headset, signed custody, desk — nahi.

### A.2 Why IT teams care (India, IT Admin — not full HRMS)

Roz ka sawal: “Rahul kab join hua, kit kit nikla, probation kab khatam, last working day kab hai?”

- **Date of joining (DOJ)** — PF/ESI/gratuity ke liye HR rakhta hai; IT ko chahiye **kit issue timing** aur “new joiner this week” queue.  
- **Expected start vs actual DOJ** — offer 1 Oct, join 15 Oct; laptop 1 Oct pack hota hai.  
- **Reporting manager** — assign + ticket routing. Field hai, form nahi.  
- **Probation end (typically 3–6 months in India)** — confirmation ke paas extra kit / contractor conversion. ITAM mein yeh “contract ending” jaisa follow-up ho sakta hai.  
- **Last working day / notice** — offboard aaj binary hai. LWD ke bina “recover laptop by Friday” nahi chalta.  
- **Seat / floor / bay** — “Pune 4th floor, bay 12” physical audit ke liye.  
- **Work email** already `Employee.email`. Personal email **optional** (offboard recovery).  
- **Employee photo** — custody PDF / ID badge. Nice, not P0.

**Mat banao (HRIS):** PAN, Aadhaar, bank, UAN, Form 12BB, salary, PoSH training tracker. Woh HR software hai.

### A.3 Recommended employee fields (IT-sized)

| Field | Priority | Notes |
|-------|----------|--------|
| **`dateJoined` required on create**, default today, date picker | **P0** | Show on list, profile, CSV (already mapped), filter “joined last 7/30 days”, computed **tenure** |
| `managerId` on create modal | **P0** | API already |
| `expectedStartDate` optional | **P1** | Pre-join kit packing |
| `probationEndDate` optional | **P1** | Default DOJ + 90 or 180; My work chip like contracts |
| `lastWorkingDate` on offboard (required) | **P0** | Plus notes already there |
| `employmentType`: add `intern`, `consultant` | **P1** | Intern kit often cheaper / must-return |
| `deskOrSeat` string | **P1** | Floor walk |
| `personalEmail` optional | **P2** | After login disabled |
| Photo | **P2** | One image, not a gallery |
| Blood group / emergency contact | **Skip** | Not IT custody |

### A.4 Joiner loop (small, high leverage)

1. Create employee **with DOJ + manager + location**.  
2. If DOJ is **today or past**: start onboard checklist automatically (optional toggle).  
3. Checklist items: Issue **kit** (laptop + charger + mouse), Create login, VPN/MFA, ID badge, **Signed handover**.  
4. Dashboard My work: “Joining this week” + “Probation ending 14d” + existing contract-ending.  
5. Employee list sort default: newest `dateJoined` (Playwright leftover names aaj lastName se top pe aa jate hain — DOJ sort se naya joiner dikhega).

---

## B. “Assets mein sirf laptop” — yeh filter bug nahi, **do-inventory design** hai

### B.1 Serialized assets (Assets page)

Seed categories and **weight** (`seed.ts`):

| Code | Name | Weight | Typical share on a 25-row page |
|------|------|--------|--------------------------------|
| LAP | Laptop | 40 | ~10 |
| MON | **Monitor** | 20 | ~5 |
| DES | Desktop | 15 | ~4 |
| PHN | Phone | 8 | ~2 |
| PRN | Printer | 5 | ~1 |
| TAB | Tablet | 4 | ~1 |
| NET | Network | 4 | ~1 |
| SRV | Server | 4 | ~1 |

Pehli page **laptop-heavy** dikhegi. Monitor **yahi list mein hai** — Category chip “Monitor” se filter. Default filter **All** hai, laptop-lock nahi.

Asset row ke paas: `assetCode`, serial (tenant-unique), brand, model, purchase, warranty, vendor, invoice, status, condition, assignee, QR, maintenance, assignments, audit dates.

### B.2 Quantity accessories (Accessories page — alag nav)

Seed examples: **Wireless Mouse**, USB-C Charger, Headset USB, Laptop Dock, HDMI cable. Category **free text** (`Peripherals`, `Audio`, `Power`) — `AssetCategory` FK nahi.

Accessory row: `name`, `category` string, `quantityTotal`, `quantityCheckedOut`, optional `locationId`. **No** serial, asset code, brand, model, warranty, purchase, vendor, QR, status/condition, maintenance.

Checkout = employee + qty. Create modal **location bhi nahi bhejta** (schema pe field hai).

Low stock UI: `available ≤ 15% of total` heuristic. Consumables ke paas real `lowStockThreshold` hai; accessories ke paas nahi.

### B.3 Consumables (teesra drawer)

Toner, batteries, wipes — issue and gone. Check-in nahi.

### B.4 Jahan user ko “nahi aa raha” feel hota hai

1. Sidebar: **Assets** pehle, **Accessories** neeche. Labels alag.  
2. **Employee My IT** (`GET /dashboard/my-summary`) sirf `Asset` assigned. Mouse checked-out ho to **card nahi**.  
3. **My devices** (`/assets` as EMPLOYEE) wahi serialized list.  
4. Onboard: “Issue laptop” — kit mein charger+mouse **issue-kits** se ho sakta hai, checklist text laptop-only.  
5. Search assets: code/serial/brand/model — accessory name **assets search mein nahi**. Global command palette accessories include karta hai ya nahi — alag surface.  
6. Add Asset form category = Laptop/Monitor/Phone… **Mouse category seed mein nahi.** Naya mouse Asset banana ho to pehle Settings → Categories.

Yeh “bug” nahi **information architecture** hai. Fix = **ek Hardware ghar** + employee “kit” view, saari qty rows ko Assets table mein dump mat karo.

### B.5 Recommended IA

**One landing: Hardware**, three tabs (Snipe-IT / GLPI pattern):

1. **Serialized** — aaj ka `/assets` (laptop, monitor, phone, **and any mouse you decide must have a serial**).  
2. **Accessories** — reusable qty (cables, cheap mice, chargers).  
3. **Consumables** — toner, batteries.

Category chips on Serialized: Laptop / Monitor / Phone / … **visible pills**, not only a dropdown. Optional saved view “Peripherals” once MOU/HDS exist as asset categories.

Employee **My kit**: assigned assets **+** open accessory checkouts **+** due-back if `expectedReturnAt` set.

---

## C. Accessories ko “laptop jaisi” features — serial no. research

### C.1 Industry rule (do not fight this)

Snipe-IT (same three-bucket model NewVision copied):

> Accessories are tracked by **quantity**, not individual serial numbers. If you need serials, **use Assets**.

Unserialized accessories **cannot**: per-unit serial, per-unit warranty, depreciation, per-unit maintenance.

GLPI / Freshservice ITAM same split: asset (unique) vs stock item (count).

Agar 200 Logitech mice interchangeable hain, serial se list **roz ka kaam kharab** karti hai (assign 1 mouse = pehle 200 rows mein se “available” dhoondna).

Agar **ek** expensive headset (₹8k+) ya warranty claim **us unit** ka hai — woh **Asset** hai, category `HDS` / `MOU` / `KEY` / `CAM`.

### C.2 Decision tree (product copy on create)

> **Does IT need to know *which physical unit* this is in six months?**  
> **Yes** (serial, warranty claim, theft, AMC per box) → **Serialized asset.**  
> **No** (any spare from the drawer is fine) → **Accessory qty.**  
> **Used up** (toner) → **Consumable.**

**Default for this company size**

| Item | Bucket | Why |
|------|--------|-----|
| Laptop, desktop, monitor, phone, tablet, printer, AP, server | Asset (already) | Unique, expensive, warranty |
| Docking station (if serial on bottom) | **Asset** (new `DOCK`) or Accessory if cheap no-serial docks | Serial on docks is common |
| Headset with serial / noise-cancelling | **Asset `HDS`** | Warranty / theft |
| Cheap USB mouse / keyboard / cable / generic charger | Accessory | Interchangeable |
| Toner / battery pack | Consumable | Not returned |

**Do not** clone the entire Asset lifecycle onto `Accessory`. That doubles every screen (status machine, QR, unique codes, maintenance) for items you count in a cupboard.

### C.3 What *should* be copied onto Accessories (qty row — not per unit)

Aaj Accessory **bahut patla** hai. Laptop se copy karo **catalog fields**, identity fields nahi:

| Field | On Accessory (stock type) | On checkout (this issue) | Skip |
|-------|---------------------------|---------------------------|------|
| Brand / model | **Yes P0** | — | |
| Vendor + invoice (lot) | **P1** | — | Per-unit invoice |
| Purchase date / cost (lot) | **P1** | — | |
| Warranty end **of the lot** | **P1** | Optional override | Per-unit warranty calendar like assets |
| Location (create form) | **P0** — schema hai, UI nahi | — | |
| `lowStockThreshold` int | **P0** | — | 15% magic number |
| Notes / photo of SKU | P2 | — | |
| QR of **SKU** (opens qty card) | P2 | — | Per-mouse QR unless it is an Asset |
| **Serial** | Only if you promoted the type to Asset | **Optional `serialNumber` on checkout** P1 | Unique serial column on Accessory model |
| Asset code `AST-…` | No | Optional “issued with asset AST-…” FK | Fake codes for mice |
| Status available/assigned/repair | No — qty is the status | — | Full AssetStatus enum |
| Maintenance tickets | No | Link to employee + parent laptop | |
| Assign/transfer/retire | Checkout/checkin | — | |

**Checkout extras (chhote, important):**

- Optional **serial or inventory sticker** on that checkout (“this mouse SN 8X…”) — history without making 120 Asset rows. Duplicate serial warn, unique constraint optional.  
- **`issuedWithAssetId`** — Snipe-IT “checkout accessory to asset” (charger travels with laptop). Offboard already check-in accessories; bundling se “laptop wapas, charger ghum” kam hota hai.  
- Quantity on checkout (API `quantity?` hai; UI always 1).  
- Expected return on accessory checkout (loaner headset for event).

### C.4 New serialized categories (if you want mouse/headset *in Assets*)

Settings already has asset categories. Seed/add:

- `MOU` Mouse (only branded/serialized)  
- `KEY` Keyboard  
- `HDS` Headset  
- `CAM` Webcam  
- `DOCK` Dock  

Phir Assets list Category filter se dikhenge — **Accessories page se migrate mat karo blindly.** Cheap stock Accessories pe chhodo.

Issue kit “Pune laptop standard” already **next laptop + charger + mouse**. Checklist labels ko kit se match karo.

### C.5 Employee-facing “same features”

Employee ko serial tab dikhana **PII/theft** risk (public scan already serial chhupata hai). My kit pe:

- Name, category, since date, “return to IT”  
- Serial **sirf IT roles** (ya employee after login on own kit — product call; default IT-only).

---

## D. Sticky / “rigid” section on scroll

### D.1 What is sticky today

| Chrome | Sticky? |
|--------|---------|
| App Header 52px (`Header.tsx` `position: sticky; top: 0; z-index: 10`) | **Yes** |
| Sidebar `.nv-sider` `position: sticky; height: 100vh` | Yes (desktop) |
| Ant Card title (“Assets”, “Employees”, “Accessories”) `.ant-card-head` | **No** |
| `.nv-filter-row` (search + chips) | **No** — `overflow-x: auto` (sticky ke liye khatarnaak parent) |
| `.nv-grid-toolbar` (Columns / Export / density) | `position: relative`, background white — **not sticky** |
| Table `<thead>` | `DataGrid` **`sticky = false`**. JSDoc kehta hai “default true” — **lie**. Koi page `sticky` prop pass nahi karta. |
| CSS `.nv-grid .ant-table-sticky-holder` | Styles **prepared** for when sticky turns on |

User ka “main section rigid” almost certainly: **page ka naam + filters + column headers** — Excel jaisa. Aaj sirf **top 52px bar** chipakti hai; “Assets” title scroll hoke gayab.

### D.2 Why turning `sticky={true}` alone may still fail

Ant Design uses native `position: sticky`. Fail conditions:

- Koi ancestor `overflow: hidden | auto | scroll` (table body, card, layout).  
- Sticky thead `top: 0` **Header ke peeche chala jata hai** — isliye `sticky={{ offsetHeader: 52 }}` (plus filter bar height if that is also sticky).  
- `.nv-grid .ant-table-container:has(> .ant-table-header) { overflow: hidden }` — sticky holder ke saath clash ho sakta hai; verify after enabling.  
- `scroll={{ x: 1400 }}` horizontal scroll alag container — thead sticky **vertical page scroll** pe; dono saath test karo.  
- Filter row `overflow-x: auto` — us row ko sticky wrapper se **bahar** rakho ya wrapper pe overflow visible.

afc163 (Ant Design): sticky primarily designed for **body/window** scroll, `offsetHeader` se app bars.

### D.3 Recommended sticky stack (do not freeze the whole page)

Z-index top → bottom, all `position: sticky`:

1. **App Header** — already `top: 0` (52px).  
2. **Page pin** — title + primary actions + filter chips, `top: 52px`, `z-index: 9`, white/`#f4f8fc` bg, 1px border. Max ~72–96px.  
3. **Table header** — `sticky={{ offsetHeader: 52 + pagePinHeight }}`.  
4. Pagination **bottom** of viewport optional (`offsetScroll`) — Nice, not P0.

**Mat chipkao:** bulk-action strip + density + column picker + export (toolbar) — phone pe 3 sticky bands = usable height khatam.

Help TOC already `position: sticky; top: 76` — same pattern.

**Per-route:** Assets, Employees, Tickets, Vendors, Accessories table view. Chat/Help own layout — alag.

---

## E. Mobile — “sahi nahi chal rahi”

### E.1 Current policy vs your request

`FUTURE_IDEAS.md`: no **phone-width admin rewrite**. Prompt 13: **tablet floor** 768–1023 (collapsed sider, hamburger, assets table still a `<table>`). Phone **390×844** e2e: **public scan card only**.

`viewport` meta theek hai (`width=device-width`). Login 900px pe stack. Header phone pe breadcrumb + some labels hide.

**Iska matlab:** product kabhi phone IT-Admin ke liye design nahi hua. Live site phone pe “kharab” feel **expected** hai, regression nahi.

Aap ab kehte ho **mobile ke hisaab se kaam kare** — yeh naya decision hai. Scope:

- **Must work on phone:** login, Employee My IT, My devices, raise ticket, request, public scan, maybe notifications.  
- **Must be usable on phone (not pretty Excel):** IT Admin asset/employee **lookup + one action** (search, open row, assign).  
- **May stay awkward on phone:** procurement 3-way match, bulk CSV, column-resize DataGrid, Team Chat Compose. Offer “Open in desktop” banner rather than fake a 12-column grid.

Dark mode still out. Tablet floor **rahe**; phone **add** as a second breakpoint (`max-width: 639px`).

### E.2 What actually breaks (from source, not a live device lab)

| Surface | Phone problem |
|---------|----------------|
| DataGrid | Forced `scroll.x: 1400`, `table-layout: fixed`, 8+ columns — pinch-zoom / horizontal jail |
| Filter row | `flex-wrap: nowrap` + overflow-x — chips off-screen, easy to miss Category=Monitor |
| Card extra actions | Many small buttons in header `extra` — wrap/overflow |
| Modals (Add employee, checkout) | AntD desktop modal; iOS keyboard covers OK |
| Sider | Drawer/hamburger exists; 216px brand + nested chat still heavy |
| Chat | Nested in ThemedLayout on desktop; own route but composer/rail not phone-first (see research pack Part 2) |
| Sticky | Even more important on phone (little vertical space) — aaj missing |
| Touch | 32px segmented / small links; WCAG 2.2 target 24px min, 44px better |
| Employee My IT | Cards `xs={24}` — **yeh already closest to mobile** |
| Scan | Intentionally mobile-first |

### E.3 Recommended mobile behaviour (not a new app)

**Breakpoint `nv-phone`: max-width 639px**

1. Lists → **card stack** (Accessories already has Cards/Table toggle — default **Cards** on phone). Assets/Employees/Tickets same.  
2. Filters → **one search** + “Filters” bottom sheet, not 6 ChipSelects in a row.  
3. Primary action FAB or full-width button (New asset / Raise ticket).  
4. Row click = show page; swipe actions skip (accidental).  
5. Header: search icon only (already shrinking).  
6. Safe-area `env(safe-area-inset-bottom)` for iOS home indicator.  
7. Tables if kept: `scroll.x: max-content`, **one** frozen column (`fixFirstColumn` already), hide Columns/Export in overflow menu.  
8. Playwright: add 390px **logged-in Employee home + one IT Admin search** — aaj coverage zero.

**Do not:** responsive CSS that reflows 20 admin modules in one pass. Ship Employee + scan polish, then Assets/Employees cards, then tickets queue.

---

## F. Chhoti cheezein, bahut important (around these five — not a new suite)

Inhe pehle pack ke P0 security (email, scan-audit, notifications) ke **saath** socho, replacement nahi.

### F.1 People / join / leave

- Tenure column (`dateJoined` → “2y 3m”).  
- Filter: joining next 7 days (future DOJ = pre-join).  
- Offboard: last working day + “recover by” date; tickets/chat close already in ITIS pack.  
- Create login checkbox already; show **joining date vs login created**.  
- Duplicate warn: same name + DOJ (email already unique).  
- India phone format hint on employee phone (optional `+91`).  
- Manager on profile already; list column “Reports to”.

### F.2 Hardware custody (the actual IT Admin pain)

- **Unified search** “Rahul” → laptop **and** mouse checkout.  
- **Kit completeness** on employee profile: laptop without charger flagged.  
- Accessory category **preset chips** (Peripherals / Audio / Power / Cables / Bags) — aaj free-typed.  
- Parent asset on checkout (charger follows laptop).  
- Print **handover PDF** one-pager (asset codes + accessory names + sign). Nice-to-need for disputes.  
- Hostname / IMEI / MAC on **serialized** assets only (research pack).  
- Asset **photo** at assign/return.  
- Monitor **already an asset** — Help/empty copy: “Monitors are Assets; mice are Accessories unless they have a serial.”  
- Seed/docs: first-run sample should create **one monitor + one mouse checkout** on the demo employee so the split is visible.

### F.3 Lists / chrome

- Sticky stack (section D).  
- Density Compact default already on several lists — keep.  
- Filter “Category” as **visible count badges** (Laptop 498, Monitor 240…) so page-1 laptop bias samajh aaye.  
- Saved views exist on assets — add “Monitors” and “Phones” seeded views.  
- Keyboard: `/` focuses search (some grids have `searchInputId`) — phone pe hide.

### F.4 Mobile extras

- Employee bottom nav: Home / Devices / Tickets / Request (4 items). IT Admin skip bottom nav (too many modules).  
- Offline: skip (PWA non-goal).  
- Camera: scan page already; **don’t** require camera for admin lists.

### F.5 Explicitly not in this upgrade

- Merging Accessory table into Asset.  
- Custom field builder (`FUTURE_IDEAS`).  
- Full HRMS.  
- MDM / Intune.  
- Dark mode.  
- Perfect Teams on a 390px phone.

---

## G. Suggested build order (when you ask to implement)

**Slice 1 — honesty (small, 1–2 days)**  
Joining date on create/list/profile/types; default today; tenure. Accessories create: location + brand/model + category presets. Help one paragraph: Assets vs Accessories vs Consumables. Category count badges on Assets.

**Slice 2 — kit visibility**  
My IT + My devices show accessory checkouts. Onboard checklist includes charger/mouse. Hardware tabs or a clear “View accessories” next to Assets title.

**Slice 3 — sticky chrome**  
Page pin + DataGrid `sticky={{ offsetHeader }}` on Assets/Employees/Tickets. Fix overflow ancestors. Verify Header 52px.

**Slice 4 — serial policy**  
Optional checkout serial + `issuedWithAssetId`. New asset categories MOU/HDS only if you have serialized units. Do not serialise HDMI cables.

**Slice 5 — phone usable**  
Employee My IT / tickets / requests at 390px. IT Admin asset/employee **card mode** &lt;640px. One Playwright phone spec beyond scan.

**Slice 6 — joiner extras**  
Manager on create, last working day, probation end, joining-this-week My work.

Security/email/scan-audit from the research pack **parallel** rahen — yeh file unko replace nahi karti.

---

## H. Acceptance checks (later)

1. Naya employee bina DOJ save nahi; list pe date + tenure.  
2. Assets → Category Monitor dikhata hai; Accessories pe Wireless Mouse; Employee My kit **dono**.  
3. Serial-required mouse Asset `MOU` pe unique serial; cheap mouse Accessory qty.  
4. Assets page scroll: “Assets” title + filters + thead Header ke neeche chipke; content unke peeche nahi ghusta.  
5. iPhone-width: Employee home no horizontal page scroll; raise ticket submit; IT Admin can search an asset code and open it.

---

## I. Sources

- In-repo: `schema.prisma` Employee/Asset/Accessory; `CreateEmployeeModal.tsx`; `employees.service.ts` create `dateJoined: null`; `accessories/dto.ts`; `accessories/list.tsx`; `assets/list.tsx`; `DataGrid.tsx` sticky default false; `Header.tsx` 52px; `index.css` filter-row overflow; `access.ts` nav; `dashboard.controller.ts` `my-summary`; `checklists.controller.ts`; `seed.ts` CATEGORIES + accessories; `DECISIONS.md` accessories vs assets; `FUTURE_IDEAS.md` phone rewrite; `e2e/prompt13.spec.ts`.  
- [Snipe-IT accessories](https://mintlify.wiki/grokability/snipe-it/features/accessories)  
- [Snipe-IT serials on components/accessories #2934](https://github.com/grokability/snipe-it/issues/2934)  
- [Ant Design Table sticky](https://ant.design/components/table/)  
- [India IT onboarding checklist](https://www.itforsme.in/resources/templates/employee-it-onboarding-checklist-india)  
- [India joining / probation practice](https://www.wisemonk.io/blogs/employee-onboarding-checklist-in-india)

---

## J. One-line recommendation

**Joining date already in the database — put it on the form.** **Mouse/headphone already in the product — they are Accessories, not missing Assets; show the kit together and only promote units with serials into Assets.** **Sticky the page title+filters+thead under the 52px header.** **Make Employee+lookup work at phone width; do not pretend the IT Admin grid is Excel on a 390px screen.**

---

## K. Implemented vs deferred (Prompt 38, 2026-09-14)

**Shipped**

- Required joining date, tenure, intern/consultant, manager on create, last working day, 90-day probation default, My work joining/probation rows.
- Hardware tabs on Assets / Accessories / Consumables; category count pills; My kit (home + `/assets` for Employee); search `kit` payload; InventoryDecision on create.
- Accessory brand/model/location/threshold; checkout serial / parent asset / due; duplicate serial warning (not unique).
- Serial asset categories MOU / KEY / HDS / CAM / DOCK (weight 0 in demo seed).
- Sticky page pin + DataGrid `offsetHeader: 148` on Assets / Employees / Tickets / vendors (existing light colors).
- `nv-phone` ≤639px cards + Employee 4-item bottom nav; Chat/procurement desktop banner.

**Still out (on purpose)**

- Merging Accessory into Asset.
- Dark mode / new color tokens / ChipSelect restyle.
- Phone-width rewrite of all IT Admin modules; Teams-on-390.
- HRIS / MDM / unique serial on accessory checkout.
