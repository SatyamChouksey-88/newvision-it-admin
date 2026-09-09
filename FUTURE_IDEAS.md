# FUTURE_IDEAS.md

Out-of-scope ideas captured here instead of being built (see Section 2 of the brief).
Nothing here should be implemented without an explicit decision to expand scope.

- Redis/Bull (or a real job queue) for import jobs if files grow past in-process `setImmediate` + `bytea` storage
- Live HR/directory sync (Phase 3 reconciliation is manual CSV upload only)
- Fuzzy name matching on reconciliation (currently exact key match, case-insensitive)
