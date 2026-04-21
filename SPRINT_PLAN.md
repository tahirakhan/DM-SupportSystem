# Sprint Plan — ADO Feature Dashboard

## Project Summary
Angular 17 + Node.js/Express dashboard that queries Azure DevOps via REST API and displays Feature work item progress with child User Story counts.

## Stack
- **Frontend:** Angular 17 (NgModule), Angular Material 17, SCSS
- **Backend:** Node.js 18, TypeScript, Express 4, Axios
- **Integration:** ADO REST API v7 (WIQL + workitems batch)
- **Container:** Docker multi-stage + docker-compose

## Sprint Schedule

| Sprint | Goal | Files | Owner | Est. Days |
|---|---|---|---|---|
| 0 | Foundation | Root + Docker skeletons | Any | 1 |
| 1 | Backend ADO integration | All backend/src/ | Dev A | 2–3 |
| 2 | Angular shell | App module, services, models | Dev B | 2 |
| 3 | Dashboard UI | All 4 component sets | Dev B/C | 2–3 |
| 4 | Docker integration | Compose + nginx verify | Dev A+B | 1 |
| 5 | Polish | Error/empty/loading states | Any | 1 |

## Key API Endpoints (backend)
- `GET /api/health` — liveness check
- `GET /api/features?areaPath=&iterationPath=` — returns FeatureDTO[]
- `GET /api/iterations` — returns string[] of available iteration paths
- `GET /api/config` — returns default paths from config file

## User Story State Mapping
| Category | States matched (case-insensitive) |
|---|---|
| Refinement | refinement, ready for refinement, in refinement, ready, backlog refinement |
| QA | qa, in qa, testing, in test, in testing, ready for test |
| Completed | closed, done, resolved, completed, accepted |

## Resume Instructions
See `SPRINT_PROGRESS.md` for current status and next task.
