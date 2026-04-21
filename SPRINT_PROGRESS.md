# Sprint Progress

> **Agent resume instructions:** Read this file at the start of every session.
> Find the first sprint with status `🚧 In Progress` or the first `[ ]` task.
> Present a plan for that item, then wait for the user to type `proceed` before executing.
> Mark tasks `[x]` immediately after completion.

---

## Sprint 0 — Foundation
**Status:** ✅ Complete

### Tasks
- [x] Root config files (.gitignore, docker-compose, README) (@any)
- [x] backend/package.json, tsconfig.json, Dockerfile (@devA)
- [x] frontend/package.json, angular.json, tsconfig.json, Dockerfile, nginx.conf (@devB)
- [x] backend/config/ado.config.json template (@devA)
- [x] SPRINT_PLAN.md, SPRINT_PROGRESS.md (@any)

### Verification
- [x] All files generated

---

## Sprint 1 — Backend: ADO Integration
**Status:** ✅ Complete

### Tasks
- [x] backend/src/config/config.ts — loads and validates ado.config.json (@devA)
- [x] backend/src/models/work-item.model.ts (@devA)
- [x] backend/src/models/feature.model.ts (@devA)
- [x] backend/src/middleware/error.middleware.ts (@devA)
- [x] backend/src/middleware/cors.middleware.ts (@devA)
- [x] backend/src/services/ado.service.ts — WIQL + batch fetch + aggregation (@devA)
- [x] backend/src/routes/workitems.route.ts (@devA)
- [x] backend/src/routes/iterations.route.ts (@devA)
- [x] backend/src/routes/index.ts (@devA)
- [x] backend/src/app.ts (@devA)
- [x] backend/src/server.ts (@devA)

### Verification Checklist
- [ ] Fill in real PAT + org in backend/config/ado.config.json
- [ ] `cd backend && npm install && npm run dev` starts on port 3000
- [ ] `curl "http://localhost:3000/api/health"` returns `{"status":"ok"}`
- [ ] `curl "http://localhost:3000/api/iterations"` returns array of iteration paths
- [ ] `curl "http://localhost:3000/api/features?iterationPath=STEPS%5C2026%5CPI-1&areaPath=STEPS%5CSettlement%20and%20Post-Closing%5CCelestials"` returns feature array
- [ ] Peer review (@devB)

---

## Sprint 2 — Frontend: Angular Shell
**Status:** ✅ Complete

### Tasks
- [x] frontend/src/index.html, main.ts, styles.scss (@devB)
- [x] frontend/src/environments/environment.ts + environment.prod.ts (@devB)
- [x] frontend/src/app/app.module.ts (@devB)
- [x] frontend/src/app/app.component.ts + html + scss (@devB)
- [x] frontend/src/app/app-routing.module.ts (@devB)
- [x] frontend/src/app/models/feature.model.ts + work-item.model.ts (@devB)
- [x] frontend/src/app/services/ado-api.service.ts (@devB)
- [x] frontend/src/app/services/config.service.ts (@devB)

### Verification Checklist
- [ ] `cd frontend && npm install && ng serve` starts on port 4200
- [ ] No TypeScript compile errors
- [ ] App loads at http://localhost:4200
- [ ] Peer review (@devA)

---

## Sprint 3 — Frontend: Dashboard UI
**Status:** ✅ Complete

### Tasks
- [x] frontend/src/app/components/filters-bar/* (@devB)
- [x] frontend/src/app/components/dashboard/* (@devB)
- [x] frontend/src/app/components/feature-card/* (@devC)
- [x] frontend/src/app/components/progress-ring/* (@devC)

### Verification Checklist
- [ ] Dashboard renders with filters dropdowns (Area Path locked, Iteration Path editable)
- [ ] Selecting an iteration path triggers feature load
- [ ] Each feature card shows: title, state, total/refinement/QA/completed counts, % progress
- [ ] Progress ring SVG renders correctly
- [ ] Loading spinner shows while fetching
- [ ] Error message shows on API failure
- [ ] Empty state shows when no features returned
- [ ] Peer review (@devA)

---

## Sprint 4 — Integration & Docker
**Status:** 🔲 Not Started

### Tasks
- [ ] Verify nginx proxies /api to backend correctly (@devA)
- [ ] Run `docker-compose up` end-to-end test (@devA + @devB)
- [ ] Fix any CORS / proxy issues (@devA)

### Verification Checklist
- [ ] `docker-compose up --build` succeeds
- [ ] http://localhost shows dashboard
- [ ] Dashboard loads live ADO data through Docker networking
- [ ] Peer review (@devB)

---

## Sprint 5 — Polish & Hardening
**Status:** 🔲 Not Started

### Tasks
- [ ] Test with invalid PAT — confirm graceful error message (@devB)
- [ ] Test with zero features — confirm empty state (@devB)
- [ ] Confirm localStorage persists last selected iteration path on refresh (@devB)
- [ ] Update README.md with final setup steps (@any)

### Verification Checklist
- [ ] All Sprint 3 edge cases pass
- [ ] README is accurate and complete
- [ ] Final peer review (@devA + @devB)
