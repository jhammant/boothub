# GitHub-as-shared-memory swarm

The "Watson pattern" — agents coordinate by committing markdown notes to a `.swarm/` directory in the project's git repo. Zero infrastructure beyond what every team already has.

## Install via boothub

In your `MANIFEST.md`:

```yaml
presets:
  swarm: [skills, commands, project-context, github-memory]

bundles:
  - id: github-memory
    kind: files
    files:
      - { path: .claude/skills/swarm-read.md,  from: swarm/github-memory/swarm-read.md }
      - { path: .claude/skills/swarm-write.md, from: swarm/github-memory/swarm-write.md }
      - { path: .swarm/README.md, from: swarm/github-memory/SWARM-README.md }
```

Then bootstrap: *"fetch boothub.dev/USERNAME/swarm and bootstrap me"*. The `github-memory` bundle drops three files; the `AGENTS.md` from the `project-context` bundle ties them together.

## Directory layout

```text
.swarm/
├── README.md             # convention doc
├── notes/
│   ├── cortex/
│   │   └── 2026-05-05T22:30:00Z.md
│   ├── builder/
│   ├── scholar/
│   └── sentinel/
├── decisions/            # canonical decisions (Cortex's domain)
├── synthesis/            # /synthesize outputs
└── security/             # Sentinel's running risk log
```

## Note format

```markdown
---
agent: builder
ts: 2026-05-05T22:30:00Z
tags: [code, ship]
---

**Built**: <one-line summary>
**Tested**: <test status>
**Files**: <paths or commit hashes>
**Next**: @<other-agent> <what they need to do>
```

## Conventions

- Filename: `<ISO-8601-UTC>.md`. Add a random suffix if you might race yourself in parallel.
- Commit message: `<agent-name>: <one-line summary>`.
- Mentions: `@cortex`, `@builder`, etc.
- Tags: `decision`, `code`, `research`, `audit`, `bug`, `ship`, `blocked`, `handoff`.

## Reading the swarm before acting

Every agent runs the `swarm-read` skill at the start of any non-trivial task:

1. List `.swarm/notes/` recursively.
2. Read the most recent 5 across all agents AND the most recent 5 from your own subdirectory.
3. Look for `@<your-name>` mentions and outstanding decisions.
4. If anything is ambiguous, write a question note instead of guessing.

## Why git?

- Sandboxes are disposable; git survives.
- Every write is auditable.
- No infrastructure beyond what every team already has.
- Diffs and review apply natively.
- Forks and branches let you experiment with parallel swarm states.

## Race conditions

Two agents writing to their own subdirectory can never collide. If you run parallel jobs from a single agent, add a randomised suffix:

```text
.swarm/notes/builder/2026-05-05T22:30:00Z-7f3a.md
```

## When NOT to use this pattern

- Latency matters — commit + push is seconds, not milliseconds. Use the hosted swarm (Pattern B) instead.
- Cross-repo coordination — git is per-repo by design. Use the hosted swarm with a global `scope`.
- Commit noise is unacceptable in your project history — keep `.swarm/` in a separate repo (`<user>/swarm-notes`) and submodule it.
