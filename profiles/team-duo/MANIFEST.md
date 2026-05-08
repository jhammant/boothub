---
boothub: 1
profile: team-duo
source: builtin
targets: [claude-code, cursor, codex, aider, windsurf, cline]

summary: |
  Two-persona team for an AI swarm: **Architect** (plans, decides, reviews) +
  **Builder** (implements, tests, commits). Coordinates over a shared swarm
  channel. Pick a preset:
   • /team-duo            → personas + github-memory swarm (default, zero infra)
   • /team-duo/hosted     → personas + boothub.dev hosted swarm
   • /team-duo/lite       → personas only (no swarm — single-machine, two terminals)

presets:
  default: [project-context, agents-duo, commands, github-memory]
  hosted:  [project-context, agents-duo, commands, hosted-swarm]
  lite:    [project-context, agents-duo, commands]

bundles:
  - id: project-context
    kind: files
    files:
      - { path: CLAUDE.md, from: project/CLAUDE.md }

  - id: agents-duo
    kind: files
    files:
      - { path: AGENTS.md, from: agents/AGENTS.md }
      - { path: .agents/architect.md, from: agents/architect.md }
      - { path: .agents/builder.md, from: agents/builder.md }

  - id: commands
    kind: files
    only-on: claude-code
    files:
      - { path: .claude/commands/handoff.md, from: commands/handoff.md }
      - { path: .claude/commands/note.md, from: commands/note.md }

  - id: github-memory
    kind: files
    files:
      - { path: .swarm/README.md, from: swarm/github-memory/README.md }
      - { path: .claude/skills/swarm-write.md, from: swarm/github-memory/swarm-write.md }
      - { path: .claude/skills/swarm-read.md, from: swarm/github-memory/swarm-read.md }
    post: |
      Two agents on this repo: name them claude-architect and claude-builder
      (or whatever role each is playing). Each writes notes under
      .swarm/notes/<their-id>/. Architect uses [decision]; Builder uses
      [push]/[done]/[blocker]. See .agents/ for role-specific guidance.

  - id: hosted-swarm
    kind: files
    files:
      - { path: .claude/skills/boothub-api.md, from: swarm/hosted/boothub-api.md }
    post: |
      Both agents on the same scope. Architect writes [decision] notes;
      Builder writes [push] / [blocker] notes. The user reads .agents/{role}.md
      to set context per agent.

post_install:
  - "Decide who is Architect and who is Builder. Read .agents/{role}.md."
  - "If using a swarm, agree on a stable scope name + agent-ids before starting."
  - "Architect writes decisions; Builder writes pushes. Don't blur the roles."
---

# team-duo — two-persona AI swarm

A minimal multi-agent setup: one agent plans (Architect), one agent builds
(Builder). They coordinate over a shared swarm channel — either git-backed
(`/team-duo`) or hosted (`/team-duo/hosted`).

## Why two personas?

Single-agent sessions blur planning and execution. Two personas force a
separation: the Architect can't "just write the code" because the code lives in
the Builder's terminal. This produces visible decisions (in [decision] notes)
that the Builder follows, and visible blockers (in [blocker] notes) that the
Architect resolves.

## When to use this

- One human, two terminals — running parallel sessions on the same repo.
- Two humans pairing — one drives planning, one drives implementation.
- Larger projects where review-as-you-go beats review-at-PR-time.

## When *not* to use this

- Trivial work — overhead doesn't pay back.
- Solo prototyping — `/starter` is enough.
- More than 2 active agents — graduate to `/team-quad`.

## What's in the box

- **AGENTS.md** — protocol overview both personas read.
- **.agents/architect.md** — Architect role definition + tag conventions.
- **.agents/builder.md** — Builder role definition + tag conventions.
- **Swarm bundle** — `.swarm/` directory + skills for read/write coordination.
- **/handoff** and **/note** — slash commands for cross-session continuity.

## After install

Open `.agents/architect.md` and `.agents/builder.md` and decide which terminal
is which. The first thing each agent does is write a `[brief]` note announcing
its role.
