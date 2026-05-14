---
sprint: 002
slug: sprint-progress-foundation
status: planned
target_branch: develop
created: 2026-05-14
---

# Sprint 002 — Sprint Progress Dashboard + Foundation (Teams, Cache, Charts)

## Requirements (verbatim)

> # Task: Add Sprint Progress & Developer Productivity Dashboards
>
> ## Context
> This is a MEAN stack app (MongoDB, Express, Angular, Node) I use as a delivery manager to track multiple engineering teams. The backend already connects to Azure DevOps (ADO) using a PAT stored in env config. Before writing any code, **explore the existing codebase** to understand:
> - How the ADO service is structured (client wrapper, auth, base URLs, org/project config)
> - Existing API route patterns (controllers, middleware, error handling)
> - Existing Angular module/component structure, routing, shared services, and any chart library already in use (e.g. ng2-charts, ngx-charts, ApexCharts). **Reuse what's there.** Do not introduce a second chart library.
> - Existing MongoDB models and whether any ADO data is cached/persisted
> - Existing styling conventions (Material, Bootstrap, custom SCSS)
>
> Match the existing patterns. Don't restructure the project.
>
> ## What to Build
>
> Two new dashboards, both scoped to **one team at a time** via a team selector at the top (reuse the existing team list if one exists; otherwise fetch from ADO `/teams` endpoint).
>
> ### Dashboard 1: Sprint Progress
> For the currently active sprint of the selected team:
> - Sprint name, start/end dates, days remaining, % complete (by story points and by count)
> - Burndown: ideal vs actual remaining story points by day
> - Work item breakdown by state (New, Active, Resolved, Closed) — donut or stacked bar
> - Scope change indicator (items added or removed after sprint start)
> - List of at-risk items: Active items with no updates in 3+ days, or items still Active past 75% of sprint duration
> - Blocked items (tagged "Blocked" or with the `Blocked` field set)
>
> ### Dashboard 2: Developer Productivity (Current Sprint)  *— sprint-003 scope*
> ### Dashboard 3: 8-Sprint Productivity Comparison  *— sprint-003 scope*
>
> ## Backend Work
> - New routes: `/api/dashboards/sprint-progress`, `/api/dashboards/developer-productivity`, `/api/dashboards/productivity-comparison`
> - Accept `teamId` (and `sprintId` or `sprintCount` where applicable)
> - Pull from ADO via existing PAT wrapper
> - **Cache aggressively** — per-sprint aggregates with TTL (15 min active, 24 hr closed). Manual refresh button bypasses cache.
> - Return data already shaped for the frontend.
>
> ## Frontend Work
> - Three new Angular components/routes under a `dashboards` feature module
> - Team selector reused across all three (shared service)
> - Loading skeletons
> - Error states for ADO API failures
> - Responsive
>
> ## Definition of Done
> - All three dashboards load with real ADO data
> - Formulas documented in code
> - Outlier thresholds as constants at top of service file
> - No new chart library added if one exists
> - Cache layer works

## Reality check vs requirements (planning Q&A on 2026-05-14)

- **MongoDB**: not present in the codebase. User decision: **add it now** as part of sprint-002.
- **Chart library**: none present (PI burnup is hand-rolled SVG, `progress-ring` is hand-rolled SVG). User decision: **add `ng2-charts` (Chart.js)**. No competing library, so first one wins.
- **`/teams` endpoint**: doesn't exist in the backend. User decision: **fetch from ADO automatically** via `_apis/projects/{project}/teams` plus `_apis/work/teamsettings` for team → area/iteration mapping.
- **Sprint commit date** (used in cycle time for sprint-003): default to **sprint start date** for v1. Revising via work-item revisions API can come later if accuracy is insufficient.
- **Scope split**: sprint-002 = foundation + Dashboard 1; sprint-003 = ADO Git integration + Dashboards 2 & 3 + outlier logic + 8-sprint comparison.
- **Burndown v1**: ideal line + single "today" actual point. Full daily history (work-item revisions API) is **deferred** — surface as a note in the dashboard and revisit if executives need it.
- **Scope change v1**: detect items added after sprint start via `System.CreatedDate > sprintStartDate`. Detecting removed items requires revision history — **deferred** to a follow-up.

## Work Items

- [ ] WI-1: MongoDB connection + cache schema
  - Files:
    - `backend/package.json` (add `mongoose`)
    - `backend/src/db/connection.ts` (new — connect on startup, exit cleanly on shutdown, log status)
    - `backend/src/db/models/cache-entry.model.ts` (new — mongoose schema with `key: string` index, `value: any`, `expiresAt: Date` index, TTL via `expires: 0` on the index)
    - `backend/src/config/loader.ts` (modify — read `MONGO_URI` env var; default `mongodb://127.0.0.1:27017/dm-support`)
    - `backend/src/server.ts` (modify — `await connectMongo()` before `app.listen`)
    - `backend/.env.example` (new or modify — add `MONGO_URI` template)
    - `README.md` (modify — note local mongo prerequisite + docker one-liner)
  - Acceptance: `npm run dev` connects to mongo (or fails fast with clear error); `db.cacheentries` collection exists; TTL index visible in `db.cacheentries.getIndexes()`.
  - Depends on: (none)

- [ ] WI-2: Generic cache service
  - Files: `backend/src/services/cache.service.ts` (new)
  - API:
    ```ts
    get<T>(key: string): Promise<T | null>
    set<T>(key: string, value: T, ttlSeconds: number): Promise<void>
    invalidate(keyPrefix: string): Promise<number>  // returns count removed
    withCache<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T>
    ```
  - Acceptance: `withCache` returns cached value if fresh, calls loader + caches on miss, treats expired entries as missing. Mongo TTL index handles eviction. `invalidate` removes by prefix using `key: { $regex: ... }`. Helper exported.
  - Depends on: WI-1

- [ ] WI-3: ADO Teams integration
  - Files:
    - `backend/src/services/ado.service.ts` (modify — add `getTeams()`, `getTeamSettings(teamId)`, `getCurrentIterationForTeam(teamId)`)
    - `backend/src/models/team.model.ts` (new — `TeamDTO = { id, name, areaPath, defaultIterationPath, currentIteration: { id, name, path, startDate, finishDate } | null }`)
    - `backend/src/routes/teams.route.ts` (new — `GET /api/teams`, `GET /api/teams/:id`)
    - `backend/src/routes/index.ts` (modify — register router)
  - ADO endpoints:
    - `GET /{org}/_apis/projects/{project}/teams?api-version=7.0`
    - `GET /{org}/{project}/{teamId}/_apis/work/teamsettings?api-version=7.0` (yields `defaultIteration`, `backlogIteration`, `defaultTeamFieldValue` which is area path)
    - `GET /{org}/{project}/{teamId}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=7.0`
  - Acceptance: `GET /api/teams` returns hydrated list (one ADO call for the list + N parallel calls for settings, but capped at concurrency 5). Cached for 1 hour via WI-2.
  - Depends on: WI-2

- [ ] WI-4: Sprint progress backend service + route
  - Files:
    - `backend/src/models/sprint-progress.model.ts` (new)
    - `backend/src/services/sprint-progress.service.ts` (new — orchestrates ADO fetches + aggregation; uses sprint-scoped stories/defects pattern per `[[project-ado-data-model]]`)
    - `backend/src/routes/sprint-progress.route.ts` (new — `GET /api/dashboards/sprint-progress?teamId=&sprintId=&refresh=`)
    - `backend/src/routes/index.ts` (modify)
  - Payload shape (`SprintProgressData`):
    - `sprint`: `{ id, name, path, startDate, finishDate, daysRemaining, percentElapsed }`
    - `team`: `{ id, name, areaPath }`
    - `summary`: `{ totalSp, doneSp, totalItems, doneItems, pctCompleteBySp, pctCompleteByCount }`
    - `stateBreakdown`: `[{ state: 'New'|'Active'|'Resolved'|'Closed'|'Blocked'|'Other', sp: number, count: number }]`
    - `burndown`: `{ ideal: [{ day, sp }], actualToday: { day, sp } }` (v1 — full daily history deferred)
    - `scopeChange`: `{ addedAfterStart: [{ id, title, sp, addedOn }] }` (removed-items detection deferred)
    - `atRiskItems`: `[{ id, title, state, assignedTo, daysSinceUpdate, reason: 'no-updates' | 'late-active' }]`
    - `blockedItems`: `[{ id, title, state, assignedTo, source: 'tag' | 'state' }]`
    - `meta`: `{ cached: boolean, cachedAt?: string }`
  - At-risk thresholds (constants at top of service file):
    ```ts
    const STALE_DAYS = 3;
    const LATE_ACTIVE_PCT = 0.75;
    ```
  - Caching: `withCache(`sprint-progress:${teamId}:${sprintId}`, ttl, loader)`. TTL: 15 min if `today <= finishDate`, else 24 hr. `refresh=1` query param calls `invalidate` then re-fetches.
  - Acceptance: route returns `SprintProgressData`; second call within 15 min hits cache (verify by adding `cached: true` to `meta`); `refresh=1` bypasses cache; type-check passes.
  - Depends on: WI-3

- [ ] WI-5: Frontend chart library, team selector, team store
  - Files:
    - `frontend/package.json` (add `chart.js` + `ng2-charts`)
    - `frontend/src/app/models/team.model.ts` (new — mirror backend)
    - `frontend/src/app/services/team-store.service.ts` (new — `BehaviorSubject<TeamDTO | null>`, methods `setTeam`, `current$`)
    - `frontend/src/app/services/ado-api.service.ts` (modify — add `getTeams()`, `getSprintProgress(teamId, sprintId?, refresh?)`)
    - `frontend/src/app/components/team-selector/team-selector.component.{ts,html,scss}` (new — mat-select bound to team store; lives in sticky header / sidebar area)
    - `frontend/src/app/app.module.ts` (modify — declare TeamSelectorComponent, import `NgChartsModule`)
  - Acceptance: selecting a team in the selector updates the team store; subscribers re-fetch.
  - Depends on: WI-4

- [ ] WI-6: Sprint Progress dashboard component
  - Files:
    - `frontend/src/app/models/sprint-progress.model.ts` (new — mirror backend)
    - `frontend/src/app/services/sprint-progress-store.service.ts` (new — BehaviorSubject store, same pattern as `pi-store.service.ts` / `sprint-update-store.service.ts`)
    - `frontend/src/app/components/sprint-progress-dashboard/sprint-progress-dashboard.component.{ts,html,scss}` (new)
    - `frontend/src/app/app.module.ts` (modify — declare)
    - `frontend/src/app/app-routing.module.ts` (modify — add `{ path: 'sprint-progress', component: SprintProgressDashboardComponent }`)
    - `frontend/src/app/components/sidebar/sidebar.component.ts` (modify — nav entry: label 'Sprint Progress', icon 'monitoring', route '/sprint-progress')
  - UI sections (top to bottom):
    1. Team selector + refresh button + "Last loaded HH:mm:ss"
    2. Sprint header card: sprint name, start/end dates, days remaining, two `progress-ring` instances (% by SP, % by count)
    3. Burndown chart (`canvas baseChart` with line config, ideal line + single "today" point)
    4. State breakdown donut (`canvas baseChart` doughnut)
    5. Scope change card (count + collapsible list of added-after-start items)
    6. At-risk items table (id, title, assignee, days since update, reason badge)
    7. Blocked items table (id, title, assignee, source badge)
  - Loading skeletons for each section while `loading$` is true. Error card with retry on failure.
  - Acceptance: navigate to `/sprint-progress`, pick a team, all sections render against live data; refresh button triggers a `refresh=1` call.
  - Depends on: WI-5

## Acceptance criteria (sprint-level)

- Backend and frontend `npm run type-check` pass.
- `npm run dev` starts backend and connects to local mongo without errors.
- `GET /api/teams` returns at least one team with `areaPath` and `currentIteration` populated.
- `GET /api/dashboards/sprint-progress?teamId=<X>` returns valid `SprintProgressData`; second call within 15 min returns `meta.cached: true`; `&refresh=1` returns fresh data.
- Navigating to `/sprint-progress` in the browser shows the full dashboard for a selected team's current sprint.
- No existing dashboard (`/`, `/pi`, `/sprint-update`) regresses.
- README updated with mongo prerequisite.

## Risks / notes

- **Mongo prerequisite**: developers need local mongo (or docker `mongo:7`). Document in README. Sprint-003 cannot start until mongo is working locally.
- **Burndown fidelity**: v1 shows ideal trajectory + today's actual only. If executives expect a full daily-history line, that's a follow-up that fetches work-item revisions (expensive — N revision calls per sprint, but cacheable).
- **Scope change "removed items"**: deferred. v1 only surfaces items added after sprint start (via `System.CreatedDate`). Removed-from-sprint detection requires revisions API.
- **ADO team area paths**: `defaultTeamFieldValue.value` is the team's area path *prefix*. We pass it `UNDER` in WIQL so child paths are included.
- **Team rate-limits**: `/teams` + N team-settings calls. Cap concurrency at 5 and cache the result for 1 hour via WI-2.
- **Workflow note**: per CLAUDE.md (2026-05-14 update), `/proceed` will not run unit tests, security review, or code-review skills. The MongoDB layer especially deserves a manual smoke check — verify TTL eviction works by setting a short TTL and inspecting `db.cacheentries.find()` after the window.
- **Inherited security debt**: WIQL injection in `queryFeatureIds` (sprint-001 risks doc) is still pre-existing. Any new WIQL in this sprint should use safe interpolation from the start — wrap area/iteration path interpolation in a `sanitizeWiqlString` helper introduced as a small bonus item if time permits, or call out as risk.
