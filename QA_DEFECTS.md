# QA defects

Logged during Prompts 29–30. Severity: blocker / major / minor / cosmetic.

## D1 — Ticket SLA “soon” chips fail WCAG AA contrast

- **Severity:** major (a11y)
- **Area:** Support tickets list (and ticket header)
- **Steps:** Sign in as IT Admin → Support Tickets. Axe-core flags `.ant-tag-gold` “Due in Xm”.
- **Expected:** 4.5:1 contrast; status not color-only.
- **Actual:** Ant Design `color="gold"` is `#d48806` on `#fffbe6` (2.75:1).
- **Root cause:** Preset Tag colors, already known unsafe on other chips.
- **Resolution:** **Fixed.** `SlaChip` in `TicketStatusTag.tsx` uses explicit `#92400e` / `#9b1c1c` pairs plus a clock/exclamation icon. Retest: `a11y.spec.ts` tickets list **pass**.

## D2 — Help article inline links distinguished by color only

- **Severity:** major (a11y)
- **Area:** Help markdown
- **Steps:** Open `/help/getting-started`. Axe `link-in-text-block` on `[Roles & Permissions](/help/roles)`.
- **Expected:** Underline or 3:1 contrast vs body text.
- **Actual:** `#0958D9` links, no underline (2.67:1 vs `#1F1F1F`).
- **Root cause:** New markdown `[text](/path)` renderer shipped without underline.
- **Resolution:** **Fixed.** Help links are underlined + `fontWeight: 600`. Retest: Help article axe **pass**.

## D3 — Real outbound email / email-in not proven on production

- **Severity:** major (ops), **deferred**
- **Area:** Notifications / helpdesk
- **Why deferred:** No `RESEND_API_KEY` or IMAP credentials on Render. Code paths are unit/e2e covered; claiming a live inbox would be false.
- **Follow-up:** Operator pastes secrets; then re-run E2.

## D4 — Full Playwright 80-file suite not re-run as one job this pass

- **Severity:** minor (process)
- **Resolution:** Help spec **12/12** (including new Chat/procurement/search/screenshot cases). Axe **8/8** after D1/D2. Remainder of the 80 is unchanged product code except SLA chips; tickets list axe was the SLA regression. **Not silently marked pass.**

## D5 — Screenshot script `waitForURL` default `load` on SPA asset show

- **Severity:** cosmetic (docs pipeline)
- **Area:** `frontend/scripts/capture-screenshots.mjs`
- **Actual:** First capture of `asset-detail.png` / assign modal timed out waiting for `load` after client-side navigation; partial PNGs still saved. Accessories card home has no `table` (Cards is default).
- **Resolution:** **Fixed** in the script (commit waitUntil, Accessories heading wait, click offset, `HELP_SHOT_ONLY`). Accessories Help article now describes Cards vs Table.

## D6 — Production 5-role live walk + two-session production chat

- **Severity:** major (release sign-off), **deferred this sitting**
- **Why:** Local seeded app + Help/a11y were executed. Production URLs still depend on Render Free wake; mailbox still D3. Do not tick E5 production as pass.
