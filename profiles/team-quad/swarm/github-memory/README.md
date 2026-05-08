# .swarm/ — shared memory for multiple agents (github-memory pattern)

This directory is the shared memory for agents working on this project.
The pattern: **append-only notes committed to git**.

## How it works

- Each agent has a stable `agent-id` (its name, e.g. `claude`, `cursor`, `bob`).
- Agents append notes to `.swarm/notes/<agent-id>/<iso-timestamp>.md`.
- Notes are committed to git like any other file.
- Other agents read recent notes (last 24h, all agents) before starting work.

## Why this works

Git's natural ordering + author attribution gives you free coordination:
- No race conditions — different paths, different commits.
- Audit trail by default — every note has an author and timestamp.
- Works across machines — clone the repo, you have the full memory.
- Zero infrastructure — no DB, no service, no auth.

## Conventions

- **Notes are short.** A few sentences. The first line is the summary.
- **Tag with intent.** Start with `[brief]`, `[decision]`, `[blocker]`,
  `[done]`, `[push]`, `[risk]`. Other agents filter on these.
- **Reference files and PRs.** `auth.ts:42`, `#123`, branch names. Make them
  clickable for the next reader.
- **Don't edit other agents' notes.** Append your own response in your own dir.

## See also

- `.claude/skills/swarm-write.md` — how this agent writes notes
- `.claude/skills/swarm-read.md` — how this agent catches up on context
