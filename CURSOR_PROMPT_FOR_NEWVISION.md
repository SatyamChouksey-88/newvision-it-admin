# NewVision — kya useful hai us “Cursor master prompt” se

**Sawal:** woh 60+ section wala “complete product upgrade / ultimate transformation” prompt is website ke liye useful hai?

**Jawab:** **Haan, ~15% process useful hai. ~70% pehle se bana hua hai ya `FUTURE_IDEAS.md` se clash karta hai. ~15% is product ke liye galat kaam hai.** As-is Agent mein paste mat karo — tokens jalen, duplicate features banenge, dark mode / PWA / SEO / AI / naya design system jaisi cheezein aa sakti hain jo yahan **mana** hain.

Yeh file **filter** hai. Naya audit nahi. Pehle se grounded reports:

| File | Use |
|------|-----|
| [`NEWVISION_RESEARCH_PACK.md`](./NEWVISION_RESEARCH_PACK.md) | Security, email-not-live, scan-to-audit, chat look, ITIS, vendors/tickets, GTM |
| [`FEATURE_UPGRADE_RESEARCH.md`](./FEATURE_UPGRADE_RESEARCH.md) | Joining date, Assets vs Accessories, sticky headers, mobile |
| [`FUTURE_IDEAS.md`](./FUTURE_IDEAS.md) | Standing non-goals |
| [`DECISIONS.md`](./DECISIONS.md) | Why accessories ≠ assets, JWT, DataGrid, import queue |

**Is pass code nahi badla.** `PRODUCT_AUDIT.md` / `UPGRADE_ROADMAP.md` / `PRODUCT_SCORECARD.md` **nahi** banaye — woh generic prompt ki copy hogi; tumhare paas already better, source-backed docs hain.

---

## 0. Short Hindi brief

Woh prompt **kisi bhi SaaS** ke liye likha gaya hai (projects, dark mode, PWA, SEO, i18n, AI). NewVision **internal ITAM + helpdesk** hai (Refine + AntD + Nest + Prisma, 5 roles, ~1,250 assets).

| Prompt kehta hai | NewVision pe asar |
|------------------|-------------------|
| Pehle samjho, rewrite mat karo | **Useful.** Framework mat chhodo. |
| Command palette, saved views, bulk, DataGrid | **Already hai.** Dobara mat banao. |
| Dark mode / PWA / SEO / AI / naya DS | **Skip.** Light-only, internal app, AntD tokens already. |
| Phone 320–414 pe har screen | **Partial.** Employee + scan + lookup; IT Admin Excel-grid mat. [`FEATURE_UPGRADE_RESEARCH.md`](./FEATURE_UPGRADE_RESEARCH.md) |
| `AGENTS.md` + `.cursor/rules` | **Useful later**, chhote rules — 8 huge `.mdc` files nahi. |
| “Analysis ke baad rukna mat, sab implement karo” | **Dangerous.** Plan → chhota slice → test. |
| Score 0–100 / 13 markdown onboarding files | **Skip.** Theater. |

**Tokens ka sahi use:** us prompt ko Agent task mat banao. Neeche wala **NewVision Cursor playbook** use karo.

---

## 1. Steal this (process) — yeh gold hai

Yeh lines product-agnostic hain aur yahan **sach** lagti hain:

1. **Rewrite mat karo.** Nest 11 + Refine 5 + AntD 5 + Prisma 7 already decided (`DECISIONS.md`). Framework swap = months, zero user value.  
2. **Working functionality mat todo.** APIs/contracts tabhi badlo jab versioned / tesed migration ho.  
3. **Fake/mock mat daalo** jahan real API hai (mail console vs “fake inbox UI”).  
4. **Secrets mat expose karo.** `.env` commit nahi.  
5. **Destructive DB** bina migration + `tenantId` soch ke nahi.  
6. **Plan → review → Agent implement.** Cursor khud multi-file ke liye Plan mode recommend karta hai. Yeh mega-prompt ek hi Agent turn mein **galat** hai.  
7. **Quality gate:** Jest + Playwright + lint + typecheck jo CI pe pehle se hain — naya test runner mat lao.  
8. **UI change = browser verify** (login as real role, empty/error/loading, tablet + one phone width).  
9. **Uncommitted user work mat mitao.** Is repo mein pehle se bahut dirty tree ho sakti hai.  
10. **P0–P4 matrix** — pehle se research pack / feature file mein hai. Naya scorecard mat likho.  
11. **Measurable improvement > zyada lines.**  
12. **Subagents** tab: alag *read-only* audit streams. **Ek hi files pe parallel edit mat.**  
13. **Accessibility high-value:** labels, focus, contrast (tokens already WCAG-minded), skip flashy ARIA theater.  
14. **Empty state formula:** kya khali / kyun / agla button — `EmptyState` + `FirstRunWelcome` hain; copy polish karo, naya component nahi.  
15. **AI features tabhi** jab IT Admin ka roz ka kaam chhota ho (is product mein **abhi nahi** — triage/KB `FUTURE_IDEAS` mein mana).

---

## 2. Already built — prompt dobara “add” karega to duplicate hoga

Agar Agent ko “command palette banao / bulk banao / table banao” kaho, woh **doosra** `DataGrid` likhega.

| Prompt section | NewVision aaj |
|----------------|---------------|
| Ctrl/Cmd+K command palette | `CommandPalette.tsx` + Header |
| Shortcuts `?` / Ctrl+/ | `ShortcutsOverlay`, Help |
| Saved views / filters | Assets + tickets (`/saved-views`) |
| Bulk status / transfer / retire / assign | Assets `POST /assets/bulk`; tickets bulk-assign/close |
| Advanced tables | Shared `DataGrid`: columns, resize, density, export, keyboard, first-column pin |
| Global + module search | Command palette + list `q` + `/search` |
| Notifications | Bell + toasts + `notifications` table (targeting bug alag — research pack) |
| Audit / activity | `AuditLog` + employee history + `EventTimeline` |
| Import preview / rollback | Settings import jobs |
| Export CSV/PDF | Reports + scoped asset export |
| RBAC 5 roles, API + UI | `RolesGuard` + `RoleRouteGuard` + `access.ts` |
| Confirm destructive | `useConfirmAction`, retire/offboard Popconfirm |
| Unsaved form warning | Refine `UnsavedChangesNotifier` |
| Empty / skeleton | `EmptyState`, `TableSkeleton`, `FirstRunWelcome` |
| Design tokens | `frontend/src/theme.ts`, `design-reference/DESIGN_TOKENS.md` — **naya DS mat** |
| Keyboard on grids | `useTableKeyboard` |
| Tablet nav | `TabletCollapse`, hamburger drawer, Prompt 13 e2e |
| Public scan | `/scan/:code` mobile-first |
| Help / onboarding copy | In-app Help (kuch **stale** — e.g. “no bulk assign” while bulk exists) |
| CI | GitHub Actions lint/type/unit/e2e |
| Pagination / sort / filter API | `_start/_end/_sort` already |

**Help honesty:** in-app Help ab bhi kahin **“no bulk assign”** kehta hai jab Assets toolbar bulk assign deti hai. Prompt ka “UX copy” yahan **doc fix** hai, naya bulk UI nahi.

---

## 3. Useful *for this website* — jo abhi gap hai (prompt se map)

Mega-prompt ke generic buckets → **tumhare existing backlogs**. Naya wishlist mat nikalna.

### 3.1 Security / data (P0) — prompt §19, §F, “never rely on frontend auth”

Research pack Part 1. Prompt sahi kehta hai: API pe `@Roles` / scope. **Already mostly true**, leftovers:

- Catalog APIs without roles, dashboard setup leak, broadcast `isRead`, ticket uploads vs chat allow-list, rate limit / Helmet / Swagger / demo password / no login audit.

**Do this. Do not** “add a new permission system from scratch.”

### 3.2 Core IT workflows (P1) — prompt §3 clicks, §13 onboarding, §11 history

[`FEATURE_UPGRADE_RESEARCH.md`](./FEATURE_UPGRADE_RESEARCH.md) + research pack Parts 3–4:

- Joining date on form (DB field already).  
- My kit = assets **+** accessory checkouts.  
- Sticky page chrome + table `offsetHeader`.  
- Phone: Employee usable; IT lists → cards &lt;640px, not 1400px table shrink.  
- Scan **write** audit (prompt ka “mobile” yahan **floor walk**, admin rewrite nahi).  
- Live email, inbound attachments, follow-up-on-closed, GSTIN/PAN.

Prompt ka “reduce clicks” = **issue kit + joining date + one Hardware tab**, naya command palette nahi.

### 3.3 Tables (P1/P2) — prompt §8 / §I

Sticky headers **on**. Category count badges. Default Cards on Accessories (already) + Assets on phone. **Virtualization** 25-row pages pe premature hai — mat.

### 3.4 Responsive (P1) — prompt §25 / §46

Prompt 320px pe *har* procurement screen maangta hai → **mat**.  
NewVision: 390 Employee + 768 tablet (already tested) + 1280 IT Admin. Sticky actions on phone Employee home = useful. Bottom nav **sirf Employee** (4 items). IT Admin hamburger already.

### 3.5 Error/loading (P2) — prompt §15–16

Pattern hai; inconsistent jagah polish. Technical Prisma errors user ko mat. **Retry** on list EmptyState already. Offline PWA **mat**.

### 3.6 Accessibility (P2) — prompt §24

Focus on Header search, modals, ChipSelect, chat composer. Contrast tokens already. Skip “screen reader perfect every chart.”

### 3.7 Cursor project intelligence (P2) — prompt §11 / §53

Repo root pe **`AGENTS.md` / `.cursor/rules` nahi** dikhe. **Chhota** `AGENTS.md` (1 page) future agents ke liye useful:

- Light theme only; no dark mode.  
- Accessories = qty; serial = Asset.  
- Don’t invent ServiceNow/Intune/AD.  
- Tenant-scope Prisma.  
- Verify UI in browser as a named role.  
- Prefer existing `DataGrid` / `EmptyState` / `httpClient`.

**Aath lambi `.mdc` files mat.**

### 3.8 Testing (P2) — prompt §7 / §40

Framework mat badlo. **Add** cases: joining date, employee kit accessories, sticky (Playwright scroll), 390px Employee home. Security e2e already growing (`prompt32`).

### 3.9 Performance (P3 unless measured) — prompt §E / §23

N+1 / unscoped dashboard counts = research pack. Bundle split pages already `lazy()`. `useMemo` spam mat. 1,250-row **server** pagination already — client virtualization tabhi jab pageSize 500+ ho.

---

## 4. Skip / conflict — Agent ko yeh karne mat dena

| Prompt idea | Kyun nahi |
|-------------|-----------|
| Dark mode / system theme | `FUTURE_IDEAS` + NewVision light tokens |
| PWA / install / offline shell | Internal console; sleeping Render already a trust issue |
| SEO / sitemap / Open Graph | Login ke peeche; public sirf `/scan` |
| i18n framework | India English UI; dates `formatDate` polish enough |
| Naya design system primitives | AntD + `theme.ts` |
| Naya state library / microservices | Over-engineering |
| Favorites / pin / quote-reply chat | Parking lot `FUTURE_IDEAS` |
| Fuzzy search | Reconciliation exact-match on purpose |
| Soft-delete audit / edit history | Explicitly forbidden |
| AI triage / Copilot | Non-goal |
| Analytics `user_created` pipeline | Privacy + no product analytics need yet |
| 0–100 scorecard | Vanity; existing P0 lists better |
| `ARCHITECTURE.md` + 6 more setup docs | README + DECISIONS + Help enough; **stale docs** fix karo |
| “Implement every phase, don’t stop” | Scope bomb; dirty git tree |
| Replace JWT / add random caches | Hardening list pehle (httpOnly refresh already in later prompts — verify, don’t reinvent) |
| Phone-first entire admin | Feature upgrade file: usable lookup, not Excel on 320px |
| Merge Accessory into Asset | Snipe-IT + `DECISIONS.md` |

---

## 5. Kaise Cursor use karo (tokens)

**Galat:** yeh poora master prompt Agent box mein paste.

**Sahi loop** (Cursor docs ke Plan → Agent se match):

1. **Plan mode** — ek slice, existing MD se: e.g. “Joining date UI; schema already has `dateJoined`.”  
2. Review diff mentally against `FUTURE_IDEAS` + “already have” table upar.  
3. **Agent** — sirf us slice ke files.  
4. Tests: targeted Jest/e2e, poora mega-suite tab jab CI.  
5. Browser: us role se woh flow.  
6. Ruko. Agli slice research pack unified top 12 se.

**Ek Agent session = ek P0/P1.** Security leftovers **alag** session joining-date se.

Subagents: read-only “security leftovers vs current source” **theek**; teen agents `index.css` edit **nahi**.

**Paused mid-upgrade / ship to GitHub + Render?** Use [`RESUME_AND_SHIP_PROMPT.md`](./RESUME_AND_SHIP_PROMPT.md) (audit → commit → deploy), not the 60-section mega-prompt.

---

## 6. Agar phir bhi ek pasteable prompt chahiye

Agent ko **yeh** do, 60 sections nahi:

```text
You are upgrading NewVision (existing Refine+AntD / Nest+Prisma ITAM).

Read first: FUTURE_IDEAS.md, DECISIONS.md, NEWVISION_RESEARCH_PACK.md,
FEATURE_UPGRADE_RESEARCH.md.

Do not rewrite the app. Do not add dark mode, PWA, SEO, AI, i18n, a new
design system, a second DataGrid, or merge Accessories into Assets.

Reuse DataGrid, EmptyState, CommandPalette, httpClient, RolesGuard.

This session implements ONLY: <one slice, e.g. employee dateJoined on
create/list/profile + types.ts>.

Add/adjust tests. Do not commit unless asked. Verify in browser if UI.
If you find extra issues, list them — do not implement them in this session.
```

`<one slice>` examples: joining date; sticky `offsetHeader` on Assets/Employees; My IT accessory checkouts; ticket upload allow-list.

---

## 7. One-line

**Prompt ka dimaag rakho (samjho, mat tod, verify, chhote slices). Prompt ki shopping list mat.** NewVision ko “generic enterprise SaaS” banana usko Freshservice-without-focus bana dega — woh pehle se `FUTURE_IDEAS.md` mein mana hai.
