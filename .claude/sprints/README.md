# Sprints

Shared sprint definitions. Each sprint is a markdown file `sprint-NNN.md` with frontmatter and work items. See [../../CLAUDE.md](../../CLAUDE.md) for the full workflow.

## Files

- `sprint-NNN.md` — one per sprint (e.g. `sprint-001.md`, `sprint-002.md`)
- `current.md` — single-line pointer to the sprint slug currently in flight (e.g. `sprint-003`)

## Conventions

- Work items use `[ ]` (not started), `[~]` (in PR), `[x]` (merged).
- Multiple developers can work on different work items in the same sprint. Each one creates a branch off `develop` named `feature/sprint-NNN-<slug>` (add `-wi<N>` if running in parallel with another dev).
- Personal "what I'm currently on" lives in each developer's memory, not in these files.
