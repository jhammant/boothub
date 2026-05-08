---
boothub: 1
profile: team-quad
source: builtin
targets: [claude-code, cursor, codex, aider, windsurf, cline]

summary: |
  Four-persona team for a serious AI swarm:
   • Architect  — decides what + why
   • Builder    — implements, tests, commits
   • Researcher — investigates the codebase, surveys options, no decisions
   • Guardian   — review-only, blocks on regressions/security/tests

  Picks a preset:
   • /team-quad           → 4 personas + github-memory swarm (default)
   • /team-quad/hosted    → 4 personas + boothub.dev hosted swarm
   • /team-quad/lite      → personas only (no swarm)

presets:
  default: [project-context, agents-quad, commands, github-memory]
  hosted:  [project-context, agents-quad, commands, hosted-swarm]
  lite:    [project-context, agents-quad, commands]

bundles:
  - id: project-context
    kind: files
    files:
      - { path: CLAUDE.md, from: project/CLAUDE.md }

  - id: agents-quad
    kind: files
    files:
      - { path: AGENTS.md, from: agents/AGENTS.md }
      - { path: .agents/architect.md, from: agents/architect.md }
      - { path: .agents/builder.md, from: agents/builder.md }
      - { path: .agents/researcher.md, from: agents/researcher.md }
      - { path: .agents/guardian.md, from: agents/guardian.md }

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
      Four agents on this repo: name them claude-architect, claude-builder,
      claude-researcher, claude-guardian. Each writes notes under
      .swarm/notes/<their-id>/. Read .agents/{role}.md before starting.

  - id: hosted-swarm
    kind: files
    files:
      - { path: .claude/skills/boothub-api.md, from: swarm/hosted/boothub-api.md }
    post: |
      All four agents on the same scope. Different agent-ids per role. The
      hosted swarm gives you a browser-visible status page at
      boothub.dev/s/<scope> — useful with 4 personas.

post_install:
  - "Decide which terminal/session is which role. Read .agents/{role}.md."
  - "Quad is overkill for trivial work — use it on real projects with multi-day scope."
  - "Researcher and Guardian *never* write code. If they want to, they're misusing the role."
---

# team-quad — four-persona AI swarm

A serious multi-agent setup. Roles:

- **Architect** — what + why, makes binding decisions
- **Builder** — implements, tests, commits
- **Researcher** — investigates the codebase, surveys options for the Architect, no decisions
- **Guardian** — review-only, blocks on regressions/security/tests

The four roles are deliberately constrained. Researcher and Guardian *don't write
code* — that's the Builder's job. Architect *doesn't run commands* beyond
read-only investigation — that's everyone else's job. The constraints are the
point: they force visible, accountable handoffs through the swarm channel.

## When to use this

- Multi-day projects with non-trivial design surface.
- Codebases where regressions are expensive (auth, billing, data migrations).
- Mixed-skill teams where one human plays Architect and others split implementation.

## When *not* to use this

- Anything `/starter` or `/team-duo` could handle. Quad is *more*, not better.
- Small teams (one or two humans). The orchestration cost outweighs benefit.

## What's in the box

- 4 role files in `.agents/` — read-once, follow-always.
- `AGENTS.md` — the protocol all four roles share.
- Swarm bundle — `.swarm/` (or hosted) for cross-role notes.
- `/handoff` and `/note` slash commands.

## After install

Each terminal/session adopts a role by reading the matching `.agents/<role>.md`
file. The first thing that role does is post a `[brief]` note announcing
itself. From there, the protocol in `AGENTS.md` runs the show.
