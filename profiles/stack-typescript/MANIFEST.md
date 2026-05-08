---
boothub: 1
profile: stack-typescript
source: builtin
targets: [claude-code, cursor, codex, aider, windsurf, cline]

summary: |
  TypeScript stack conventions for AI agents:
   • strict mode (no `any` without comment)
   • vitest for tests
   • zod at every boundary (HTTP, env vars, IPC)
   • node:test or vitest, never jest unless asked

  Drops a CLAUDE.md tuned for these rules + an AGENTS.md addendum. Stackable
  with /starter or /team-* profiles — install both and the stack-specific
  CLAUDE.md will be the one that ships.

presets:
  default: [conventions]
  lite:    [conventions-lite]

bundles:
  - id: conventions
    kind: files
    files:
      - { path: CLAUDE.md, from: project/CLAUDE.md }
      - { path: AGENTS.md, from: agents/AGENTS.md }

  - id: conventions-lite
    kind: files
    files:
      - { path: CLAUDE.md, from: project/CLAUDE.md }

post_install:
  - "Adjust the conventions to match your project (build script, test command, lint config)."
  - "If you're stacking with /starter or /team-*, install that *first*, then this — this profile's CLAUDE.md should win."
---

# stack-typescript — TS conventions for AI agents

A drop-in convention bundle for TypeScript projects. Sets up CLAUDE.md and
AGENTS.md with rules tuned for: strict mode, vitest, zod at boundaries, no
`any` without a justifying comment.

## What you get

- **CLAUDE.md** — project instructions tuned to TS idioms.
- **AGENTS.md** — agent-facing addendum: which commands to run, what tests
  count as "passing", which warnings are blocking.

## Stacking with other profiles

This is a "stack" profile — pure conventions, no swarm or commands. Pair it
with `/starter` (single-agent), `/team-duo`, or `/team-quad` (multi-agent).

Install order matters: install the role/swarm profile *first*, then this one,
so the stack-tuned CLAUDE.md overwrites the generic one.

## What's *not* here

- No package.json or tsconfig.json — those depend on your build setup.
- No CI config — depends on your runner.
- No linter config — pick eslint, biome, oxlint as you prefer; the conventions
  are tool-agnostic.

If you want opinionated tooling defaults, those belong in a downstream profile
that pins specific versions and configs.
