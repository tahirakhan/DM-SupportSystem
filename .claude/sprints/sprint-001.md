---
sprint: 001
slug: sprint-executive-update
status: planned
target_branch: develop
created: 2026-05-14
---

# Sprint 001 — Sprint Executive Update Dashboard

## Requirements

> I want to build a new dashboard which gives me 3 different updates.
>
> If we are in the first week of the sprint.
> Need executive update, We should be able to see the commitment made by the team during the planning and only consider 50% capacity of the team or 50% story point as a target for the first week to be completed from the QA.
> List down important features team will be working on during the first week based on 50% story point.
> Story point team will be working on per feature, total number of story point remining in a feature.
> Any blockers or dependencies in that item.
>
> If we are in the second week of the sprint.
> Need executive update, We should be able to see the update on the commitment made in the first week
>
> and also want to see the remaing item as the target for the second release
> Team -> Team is represented by Area Path

## Clarified scope (from planning Q&A on 2026-05-14)

- **3 views**: Week 1, Week 2, **Post-Sprint** (3rd update = sprint-close retrospective for execs).
- **"Completed from QA"** = stories whose state is `Ready for Prod`, `Closed`, or `Done` (strictly past QA).
- **Target metric**: 50% of committed story points for week 1 (capacity API deferred — story points only in v1).
- **Week detection**: auto-computed from today's date vs sprint `startDate` (days 1–7 = Week 1, day 8+ = Week 2, after `finishDate` = Post-Sprint), with a manual tab override.
- **Filter scope**: Area Path + Sprint Iteration Path (a single sprint, not a PI).
- **Blockers / dependencies** (defaults — call out if your ADO uses different conventions):
  - Blocker: `System.Tags` contains "Blocked" OR state == "Blocked"
  - Dependency: ADO link types `System.LinkTypes.Dependency-Forward` / `-Reverse`

## Work Items

- [ ] WI-1: Backend types for sprint-update payload
  - Files: `backend/src/models/sprint-update.model.ts` (new)
  - Acceptance: types compile; defines `SprintUpdateData`, `FeatureRow` (with `spInProgress`, `spRemaining`, `blockers[]`, `dependencies[]`), `WeekView` enum, `WeeklySummary` shape covering commitment / 50% target / qa-done count. No logic.
  - Depends on: (none)

- [ ] WI-2: Extend ADO service — blockers, dependencies, and sprint-update fetch
  - Files: `backend/src/services/ado.service.ts` (modify)
  - Acceptance:
    - Existing dashboards still work (no regression in `getPiData`, `getDashboardData`, etc.).
    - Stories now include `tags: string[]` and `dependencies: {id, title, state}[]` (forward+reverse) when fetched for this dashboard.
    - New method `getSprintUpdateData(areaPath, sprintIterationPath)` returns `SprintUpdateData` with: total committed SP, 50% target, week-1 done SP (states in [Ready for Prod, Closed, Done]), week-2 remaining SP, feature rows, sprint start/finish dates, computed week.
  - Depends on: WI-1

- [ ] WI-3: Backend route `/api/sprint-update`
  - Files: `backend/src/routes/sprint-update.route.ts` (new), `backend/src/routes/index.ts` (modify — register router)
  - Acceptance: `GET /api/sprint-update?areaPath=...&iterationPath=...` returns valid `SprintUpdateData` JSON. 400 on missing params; pass through service errors.
  - Depends on: WI-2

- [ ] WI-4: Frontend types + API client + store
  - Files:
    - `frontend/src/app/models/sprint-update.model.ts` (new, mirror of backend types)
    - `frontend/src/app/services/ado-api.service.ts` (modify — add `getSprintUpdate(areaPath, iterationPath)`)
    - `frontend/src/app/services/sprint-update-store.service.ts` (new — BehaviorSubject pattern, same shape as `pi-store.service.ts`)
  - Acceptance: store exposes `data$`, `loading$`, `error$`, `hasFetched$`, `lastLoaded$`, and `fetch(areaPath, iterationPath, force)` with same-filter guard.
  - Depends on: WI-3

- [ ] WI-5: Sprint Executive Update dashboard component + wiring
  - Files:
    - `frontend/src/app/components/sprint-update-dashboard/sprint-update-dashboard.component.{ts,html,scss}` (new)
    - `frontend/src/app/app.module.ts` (declare)
    - `frontend/src/app/app-routing.module.ts` (add `/sprint-update` route)
    - `frontend/src/app/components/sidebar/sidebar.component.ts` (add nav entry — icon: `summarize` or `assessment`)
  - Acceptance:
    - Setup card on first load: Area Path + Sprint Iteration Path dropdowns, "Load Update" button.
    - After load: sticky filter bar + 3 tabs (Week 1 / Week 2 / Post-Sprint).
    - Default tab auto-selected from today's date vs sprint `startDate`/`finishDate`; user can click to override.
    - **Week 1 view**: total committed SP, 50% SP target, SP done (past-QA states), per-feature rows with `feature`, `SP in progress`, `SP remaining`, `blockers`, `dependencies`.
    - **Week 2 view**: week-1 commitment recap (target vs actual past-QA), remaining items as week-2 target, same per-feature row structure.
    - **Post-Sprint view**: total commitment vs delivered, completion %, carryover list, blocker / dependency summary.
  - Depends on: WI-4

## Acceptance criteria (sprint-level)

- All work items pass `npm run type-check` in both backend and frontend.
- Backend `/api/sprint-update` returns a valid payload for a known area path + sprint iteration path.
- Frontend dashboard renders without errors against live backend data.
- `/security-review` flags no HIGH-severity issues on new code.
- No regression in existing dashboards (`/`, `/pi`, etc.).
- Unit tests cover at least: week computation logic, the 50% SP target math, the "past QA" state filter, and the store's same-filter guard.

## Risks / notes

- **ADO blocker / dependency conventions**: if your ADO project uses a custom field (not tags / not state == "Blocked") for blockers, or a different link-type name for dependencies, WI-2 will need adjustment. Confirm by checking one known-blocked work item after WI-2 lands.
- **Sprint length**: logic assumes ~2-week sprints. If a sprint is 3+ weeks, days 14+ stay on Week 2 view until `finishDate`, then Post-Sprint. Document this in the component.
- **Capacity API**: explicitly deferred for v1. If executives later need hours-based capacity targets, that's a follow-up sprint adding `/work/teamsettings/iterations/{id}/capacities` integration.
- **State name strings**: the "past-QA" filter hardcodes `Ready for Prod`, `Closed`, `Done`. If the team's process template uses different state names, surface those in a config or constant — don't scatter them.

## Security debt — tracked for follow-up sprint

The security review on 2026-05-14 flagged a HIGH-severity **WIQL injection** in `queryFeatureIds` ([backend/src/services/ado.service.ts:442-449](../../backend/src/services/ado.service.ts#L442-L449)) — `areaPath` and `iterationPath` are interpolated into the WIQL query with no escaping. The vulnerability is **pre-existing** (also affects `/api/features`, `/api/pi`, `/api/dashboard` — every endpoint that takes those filters). Sprint-001 inherits it via `getSprintUpdateData`, which calls the same `queryFeatureIds`.

User decision (2026-05-14): track as follow-up sprint rather than fix in this sprint.

**Follow-up sprint scope** when created:
- Add a `sanitizeWiqlString` helper (escape single-quote → `''`, reject embedded newlines)
- Apply to every user-input string interpolated into WIQL queries in `ado.service.ts`
- Review `error.middleware.ts` for the medium-severity error-detail leakage
