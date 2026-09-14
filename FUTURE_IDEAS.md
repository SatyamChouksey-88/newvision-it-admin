# FUTURE_IDEAS.md

Out-of-scope ideas captured here instead of being built (see Section 2 of the brief).
Nothing here should be implemented without an explicit decision to expand scope.

## Standing non-goals (master prompt 32–37)

Do not build these without an explicit product decision:

- Live AD / Entra / Intune / Autopilot / MDM / remote-wipe / remote-control, or network discovery
- A configurable KB engine or AI triage / article-suggestion
- A full SLA escalation engine with business hours
- ITIL problem / change / CMDB / service-catalog
- A Zendesk-style merge/split product (`duplicate-of` is not a merge)
- A custom-fields builder
- Multi-mailbox / Slack ingest
- Supplier self-portal / PunchOut / OCR / e-invoicing-IRN / GST-filing / GL / payment execution
- A perfect Teams clone (calls / meetings / screenshare / federation / GIFs / stickers)
- Dark mode, a phone-width **admin rewrite**, an integrations marketplace, or a "free forever" tier

**Prompt 38 shipped phone-*usable* Employee + IT lookup** (`nv-phone` ≤639px, bottom nav for Employee only, list cards, desktop banner on Chat/procurement). That is not a rewrite of the IT Admin grid. Dark mode stays out. The current ChipSelect / status color coding stays.

Two standing limits: **NewVision does not move money**, and **duplicate-of is not a merge**.

## Parking lot

- Redis/Bull (or a real job queue) for import jobs if files grow past in-process `setImmediate` + `bytea` storage
- Live HR/directory sync (Phase 3 reconciliation is manual CSV upload only)
- Fuzzy name matching on reconciliation (currently exact key match, case-insensitive)
- SLA-breach automation or escalation engine (overdue is visual only)
- Configurable ticket-routing rules builder
- Knowledge-base / self-service article suggestions
- Multi-mailbox or Slack/Teams/SMS ticket ingestion (one shared mailbox email-in is built)
- AI-assisted triage or auto-categorization
- Gamified leaderboards
- User-configurable custom-fields builder
- Full ticket merge/split (one-way “duplicate of” linking covers the real need)
- Satisfaction-survey scheduling / re-send (rate once, no reminders)
- Customizable notification-template content/branding
- e-sourcing / reverse-auction tools
- Supplier self-service portal or PunchOut/cXML catalogs
- Full contract-lifecycle management with clause libraries
- Multi-entity / multi-currency / multi-country procurement consolidation
- OCR-based automatic invoice capture
- Full GL / encumbrance accounting
- Pin / Favorites, bookmark, and forward/quote-reply in Team Chat (Find, read receipts on small DMs, Mute, Unread/Mentions pills, and Mark all read shipped in Prompt 34). Quote-reply is the feature people will ask for next — it is a product decision, not a CSS leftover.
- Audio/video calls, meetings, screen sharing, guest/external chat, or federation with Microsoft Teams (explicitly out of scope for the in-app Teams-style chat)
- Tenor GIFs, stickers, Loop, Copilot, or a purple re-theme of the admin console

## Prompt 38 — phone *usable* vs phone rewrite

Employee My IT / My kit / tickets / requests work at ≤639px (`nv-phone`) with a 4-item bottom nav. IT Admin lists switch to stacked cards + search; Chat and procurement show a desktop-only banner. A phone-width **admin rewrite** (every module as Excel-on-390, Teams clone, dark mode) stays out.

- Bulk manual-edit tool (use import/reconciliation)
- Editing or deleting audit log entries, notes, or comments once posted
