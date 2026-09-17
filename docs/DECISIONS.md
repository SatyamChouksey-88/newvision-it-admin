# Engineering decisions (NewVision)

| Topic | Decision |
|-------|----------|
| Large service files | `tickets.service.ts` and `ChatPage.tsx` stay unsplit for v1 (cohesion vs review churn). |
| KB / license compliance | Descoped — in-app Help + tickets/procurement; no separate KB microservice. |
| Import jobs | In-process queue acceptable for v1; streaming parse + batched commit; optional Redis worker later. |
| Custom roles | Hybrid API auth: system roles use `@Roles()`; `customRoleId` users use `route-permissions.generated.ts` + `effectivePermissions()`. |
| Deploy target | **Undecided** — `render.yaml` is legacy; see `TECHNICAL_REFERENCE.md` deployment note. |
