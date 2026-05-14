# DM SupportSystem — Sprint Workflow

This project runs on a **sprint-based workflow** driven by Claude Code skills.
Multiple developers share sprint definitions via the repo; individual progress
lives in each developer's local Claude memory.

## Stack

- **Backend**: Node.js + Express + TypeScript. Build: `npm run build` (in `backend/`). Dev: `npm run dev`.
- **Frontend**: Angular 17 + Material 17. Build: `npm run build` (in `frontend/`). Dev: `npm start`.
- **Tests** (per `.claude/sprints/` decisions): Jest for backend, Karma + Jasmine for frontend. Install on first sprint that introduces testable code.
- **Branching**: feature branches off `develop`. PRs target `develop`.

## Sprint workflow

### Creating a sprint (conversational — no slash command)

When the user describes requirements for a new sprint (phrases like "create sprint N with these requirements", "new sprint:", "let's plan sprint N", etc.), do the following without being asked:

1. Look at `.claude/sprints/` to determine the next sprint number (or use the one the user gave).
2. Delegate plan generation to the **sprint-planner** agent (Opus). Give it the requirements verbatim.
3. The planner returns a structured plan; write it to `.claude/sprints/sprint-NNN.md` (zero-padded, e.g. `sprint-003.md`).
4. Update `.claude/sprints/current.md` to point at the new sprint.
5. Save a memory note (`project_current_sprint.md`) recording the active sprint for this developer.
6. Tell the user the plan is ready and they can review/edit `.claude/sprints/sprint-NNN.md`, then run `/proceed` when ready.

### Sprint file format (`.claude/sprints/sprint-NNN.md`)

```markdown
---
sprint: NNN
slug: short-kebab-name
status: planned | in-progress | complete
target_branch: develop
created: YYYY-MM-DD
---

# Sprint NNN — Title

## Requirements
(verbatim from user)

## Work Items
- [ ] WI-1: Description — files: backend/src/foo.ts, frontend/src/bar.ts
- [ ] WI-2: ...

## Acceptance criteria
- ...

## Notes
- ...
```

Each work item checkbox flips to `[x]` only when it lands in a merged PR. While
in progress, the developer tracks their personal status in memory, not in the file.

### `/sprint [N]` command

- `/sprint` (no arg) — show all sprints in `.claude/sprints/` with status. Highlight current.
- `/sprint N` — load `sprint-NNN.md`, print the plan, mark this dev's `project_current_sprint.md` memory, and prompt the user to review and then run `/proceed`.

### `/proceed` command

Executes the current sprint plan end-to-end. See `.claude/commands/proceed.md` for the full pipeline. High-level steps:

1. Pull latest `develop`, create `feature/sprint-NNN-<slug>`, checkout.
2. Delegate code generation to **sprint-coder** (Haiku) per the plan.
3. Run builds (`npm run type-check` or `npm run build`) in both projects.
4. Verify backend (`http://localhost:3000`) and frontend (`http://localhost:4200`) are running.
5. Delegate commit + push + PR to **sprint-committer** (Haiku).
6. Update sprint file status to `in-progress` (or `complete` if all WIs done) and report PR URL.

**Explicitly removed from the pipeline (user request, 2026-05-14):** unit-test generation, security review, and code-review/simplify passes. Do not invoke `sprint-tester`, `/security-review`, or any review/simplify skill during `/proceed`. The `sprint-tester` agent file is kept for opt-in use if the user explicitly asks.

## Cost / model usage

- **Opus 4.7** is for **planning only** — invoked via the `sprint-planner` agent.
- **Haiku** is the default for everything else — `sprint-coder`, `sprint-tester`, `sprint-committer`, and the main session.
- Developers should keep their main session on Haiku (`/model claude-haiku-4-5-20251001`). The slash commands themselves delegate to subagents, so the main session does light orchestration only.

## Memory (per-developer)

Personal progress lives in each developer's `~/.claude/projects/<this-project>/memory/`. Typical files:

- `project_current_sprint.md` — which sprint+work-item this dev is actively on
- `feedback_sprint_workflow.md` — workflow rules and exceptions you've learned

Sprint definitions and work-item status are **not** memory — they live in `.claude/sprints/` so all devs see the same thing.

## Multi-developer coordination

Two devs working on the same sprint should grab different work items. Convention:

- Before starting a WI, the dev pulls latest `develop` and reads `.claude/sprints/sprint-NNN.md`.
- The `/proceed` command creates a branch named `feature/sprint-NNN-<slug>` — for parallel work add `-wi<N>` suffix.
- Merging the PR is what flips a `[ ]` to `[x]` in the sprint file (done in a small follow-up commit by the merger).

## Questions during planning

The sprint-planner agent is allowed (and encouraged) to ask the user clarifying questions before committing to a plan. If requirements are ambiguous, the planner pauses and asks.
