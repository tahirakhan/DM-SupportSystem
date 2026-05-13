---
description: Execute the current sprint plan end-to-end (branch, code, build, test, security, commit, push, PR)
allowed-tools: Read, Glob, Grep, Bash, Edit, Write, Agent, Skill
---

You are handling the `/proceed` slash command. Execute the current sprint plan end-to-end.

The main session should be on **Haiku**. Heavy work delegates to subagents. The planner is NOT invoked here — only execution agents.

## Step 0 — Verify state

1. Read `.claude/sprints/current.md` to find the current sprint slug (e.g. `sprint-003`).
2. Read `.claude/sprints/sprint-NNN.md`. Confirm it has unchecked work items. If everything is `[x]`, tell the user the sprint is complete and stop.
3. Confirm the working tree has no uncommitted changes (`git status`). If it does, tell the user and stop — they should commit/stash first.

## Step 1 — Branch

1. `git checkout develop && git pull origin develop`. If pull fails, report and stop.
2. Branch name: `feature/sprint-NNN-<slug>` (slug from sprint frontmatter). If branch already exists locally, just `git checkout` it.
3. `git checkout -b feature/sprint-NNN-<slug>` (or checkout existing).

## Step 2 — Code generation

Delegate to **sprint-coder** agent (Haiku). Pass it:
- The full sprint plan
- The list of unchecked work items
- A note that it must implement code only — no test files yet

The coder returns when done. Read its summary; if it reports blockers, surface them to the user and stop.

## Step 3 — Build verification

Run in parallel:
- `cd backend && npm run type-check` (or `npm run build` if no type-check script)
- `cd frontend && npm run type-check`

If either fails, delegate fix to **sprint-coder** with the error output. Re-run after fix. Max 2 fix attempts; if still failing, surface to user and stop.

## Step 4 — Test generation + execution

Delegate to **sprint-tester** agent (Haiku). Pass it:
- The list of files changed in this branch (`git diff --name-only develop`)
- The sprint plan

The tester:
1. Installs Jest in backend if not present (`npm i -D jest @types/jest ts-jest` + config). Adds `npm test` script.
2. Installs Karma + Jasmine in frontend if not present (Angular's `ng add @angular/karma` or equivalent). Adds `ng test --watch=false` as the test script.
3. Writes unit tests for the changed files.
4. Runs the tests. If failures, fixes the tests (not the code) — unless the test reveals a real bug, in which case it reports back.

If tester reports a real bug, surface to user with options: fix manually, dispatch coder to fix, or stop.

## Step 5 — Security review

Invoke the built-in `/security-review` skill via the Skill tool. Surface findings to the user. If findings are HIGH severity, stop and ask the user how to proceed. LOW/MEDIUM findings: log and continue.

## Step 6 — Smoke verification

Ensure both services are running:
- `curl -s http://localhost:3000/api/health` (or any known endpoint) → expect 200
- `curl -s http://localhost:4200` → expect HTML

If either is down, start it in the background (`npm run dev` in backend, `npm start` in frontend) and re-check. If still down, surface to user.

## Step 7 — Commit + push + PR

Delegate to **sprint-committer** agent (Haiku). Pass it:
- Sprint number + slug
- List of work items completed
- Branch name
- Target branch: `develop`

The committer:
1. Stages all relevant changes (no `git add -A`).
2. Writes a commit message summarizing the work (focus on *why*, reference sprint).
3. Commits with the `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer.
4. Pushes the branch with `-u origin`.
5. Opens a PR against `develop` using `gh pr create` (or surfaces the GitHub URL if `gh` isn't installed).

## Step 8 — Update sprint state

After commit, mark the executed work items as `[~]` (in-PR) in `.claude/sprints/sprint-NNN.md`. They only become `[x]` once the PR is merged. Optionally update sprint frontmatter `status: in-progress`.

Commit the sprint-file update separately (small follow-up commit on the same branch) with message `chore: mark WIs as in-PR for sprint NNN`.

## Step 9 — Report

Tell the user:
- PR URL
- What was completed
- Any warnings (security findings, test caveats)
- Next sprint / next work item suggestion

## Error handling

- If any step fails irrecoverably, stop and tell the user exactly where it stopped and what to fix.
- Never `--no-verify` past a failing hook.
- Never force-push.
- Never delete the branch on failure — leave it for the user to inspect.
