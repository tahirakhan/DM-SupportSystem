---
description: Start, resume, or view sprint work
argument-hint: "[sprint number]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write, Agent
---

You are handling the `/sprint` slash command. The user typed: `/sprint $ARGUMENTS`.

## If $ARGUMENTS is empty (no number given)

Show a status overview:

1. List every file in `.claude/sprints/sprint-*.md`. For each, read frontmatter and print:
   - Sprint number + title
   - Status (planned / in-progress / complete)
   - Count of `[x]` vs `[ ]` work items
2. Read `.claude/sprints/current.md` (if it exists) and mark which sprint is current.
3. Read memory file `project_current_sprint.md` to show which sprint/work-item *this developer* is on personally.
4. Tell the user how to proceed: `/sprint N` to switch to sprint N, then `/proceed` to execute.

## If $ARGUMENTS is a number (e.g. "3" or "003")

1. Normalize to 3-digit form (3 → 003).
2. Read `.claude/sprints/sprint-003.md`. If it doesn't exist, tell the user it doesn't exist and ask if they want to create one (and if so, ask for requirements).
3. Print the plan as-is for the user to review.
4. Update `.claude/sprints/current.md` to point at this sprint (write `sprint-003` as its content).
5. Save / update memory file `project_current_sprint.md` to record this dev is on sprint 003 (no specific work item yet — that gets set during `/proceed`).
6. End with: "Review the plan above. If it looks right, run `/proceed` to execute. If you want changes, edit `.claude/sprints/sprint-003.md` directly or describe the change and I'll update it."

## If $ARGUMENTS is not a number

Treat it as a request to create a new sprint. Delegate to the **sprint-planner** agent (Opus) with the user's argument as requirements. The planner returns a plan; write it to a new `.claude/sprints/sprint-NNN.md` (next available number) and follow the "loaded sprint" flow above.

## Important

- Do NOT execute code changes here. This command only loads, displays, or creates sprint plans.
- The planner agent runs on Opus — only invoke it for plan generation, not for status views.
- Status views and number-normalization can be done directly (no agent needed) to save cost.
