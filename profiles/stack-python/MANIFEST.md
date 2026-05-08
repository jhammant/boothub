---
boothub: 1
profile: stack-python
source: builtin
targets: [claude-code, cursor, codex, aider, windsurf, cline]

summary: |
  Python stack conventions for AI agents:
   • uv for env + deps (no pip/poetry/conda unless asked)
   • pytest for tests (no unittest unless asked)
   • type hints everywhere; mypy or pyright in CI
   • pydantic at every boundary (HTTP, env vars, IPC)

  Drops a CLAUDE.md tuned for these rules + an AGENTS.md addendum. Stackable
  with /starter or /team-* profiles.

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
  - "Install uv if you haven't: `curl -LsSf https://astral.sh/uv/install.sh | sh`."
  - "Adjust the conventions to match your project (test command, linter)."
  - "If stacking with /starter or /team-*, install that *first*, then this."
---

# stack-python — Python conventions for AI agents

A drop-in convention bundle for Python projects. Sets up CLAUDE.md and
AGENTS.md with rules tuned for: uv, pytest, type hints, pydantic at boundaries.

## What you get

- **CLAUDE.md** — project instructions tuned to modern Python idioms.
- **AGENTS.md** — agent-facing addendum: commands, what passing means.

## Stacking

Pure conventions — no swarm, no commands. Pair with `/starter`, `/team-duo`,
or `/team-quad`. Install the role profile first, then this one.

## Why uv?

Faster than pip/poetry, single binary, lockfile by default. If your project is
already on poetry or pip-tools, fork this profile and adjust — the conventions
in CLAUDE.md don't depend on uv specifically.

## Why pydantic at boundaries?

Same reasoning as zod in TypeScript: validate untrusted input *once* at the
edge, then trust the type internally. Don't sprinkle `isinstance` checks.
