# FUTURE_IDEAS.md

Out-of-scope ideas captured here instead of being built (see Section 2 of the brief).
Nothing here should be implemented without an explicit decision to expand scope.

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
- Pin, bookmark, and forward/quote-reply in Team Chat (search-in-chat, read receipts on small DMs, and per-conversation mute are already shipped)
- Audio/video calls, meetings, screen sharing, guest/external chat, or federation with Microsoft Teams (explicitly out of scope for the in-app Teams-style chat)

- Bulk manual-edit tool (use import/reconciliation)
- Editing or deleting audit log entries, notes, or comments once posted
