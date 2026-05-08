---
boothub: 1
profile: starter
source: builtin
targets: [claude-code, cursor, codex, aider, windsurf, cline]

summary: |
  Generic starter profile — minimal, opinion-light. Drops a CLAUDE.md skeleton
  + AGENTS.md + a couple of useful slash commands. Pick a preset:
   • /starter                 → just the basics (default)
   • /starter/swarm           → adds GitHub-as-shared-memory (Watson pattern, zero infra)
   • /starter/swarm-hosted    → adds boothub.dev hosted swarm (DynamoDB-backed coordination)

presets:
  default: [project-context, commands]
  swarm: [project-context, commands, github-memory]
  swarm-hosted: [project-context, commands, hosted-swarm]
  lite: [project-context]

bundles:
  - id: project-context
    kind: files
    files:
      - { path: CLAUDE.md, from: project/CLAUDE.md }
      - { path: AGENTS.md, from: agents/AGENTS.md }

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
      Commit the .swarm/ directory to share memory across agents on the same repo.
      Each agent appends notes to .swarm/notes/<agent-id>/<timestamp>.md.

  - id: hosted-swarm
    kind: files
    files:
      - { path: .claude/skills/boothub-api.md, from: swarm/hosted/boothub-api.md }
    post: |
      To use the hosted swarm, set BOOTHUB_TOKEN (claim-key from boothub.dev/share)
      and call the /api/swarm/<scope>/notes endpoints. See the boothub-api skill.

post_install:
  - "Open CLAUDE.md and customise it for your project."
  - "If you picked /starter/swarm, commit .swarm/ now."
  - "If you picked /starter/swarm-hosted, run `boothub login` (or set BOOTHUB_TOKEN)."
---

# starter — boothub default profile

A minimal, opinion-light profile that any agent can use as a starting point.
Built-in to boothub.dev — no GitHub account required to use it.

## What you get

- **CLAUDE.md** — generic skeleton you can customise per project
- **AGENTS.md** — single-agent doc; expand to multi-agent if needed
- **/handoff** and **/note** slash commands — basic session continuity

## Add a swarm

If you want multiple agents to coordinate, pick a swarm preset:

- `/starter/swarm` — uses GitHub commits as shared memory (Watson pattern). Zero infrastructure, just commit notes to `.swarm/notes/`.
- `/starter/swarm-hosted` — uses the hosted boothub.dev swarm API. DynamoDB-backed, claim-key auth, real-time-ish.

## Customise it

Once installed, edit the files and commit them to your project. The starter is meant as a launchpad, not a frozen template.
