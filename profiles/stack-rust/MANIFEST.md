---
boothub: 1
profile: stack-rust
source: builtin
targets: [claude-code, cursor, codex, aider, windsurf, cline]

summary: |
  Rust stack conventions for AI agents:
   • cargo + clippy + fmt as the trinity
   • idiomatic patterns (Result/?, no unwrap in lib code, explicit lifetimes only when forced)
   • thiserror for lib errors; anyhow for bin errors
   • workspace-aware (Cargo.toml at root)

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
  - "Make sure rustup is current: `rustup update`."
  - "If stacking with /starter or /team-*, install that *first*, then this."
---

# stack-rust — Rust conventions for AI agents

A drop-in convention bundle for Rust projects. Sets up CLAUDE.md and
AGENTS.md with rules tuned for: clippy + fmt, idiomatic error handling,
workspace layout.

## What you get

- **CLAUDE.md** — project instructions tuned to Rust idioms.
- **AGENTS.md** — agent-facing addendum: commands, what passing means.

## Stacking

Pure conventions — no swarm, no commands. Pair with `/starter`, `/team-duo`,
or `/team-quad`. Install the role profile first, then this one.

## Why these conventions?

- **No `unwrap`/`expect` in library code.** Forces explicit error handling at
  the API boundary; reserves panics for genuine "this can't happen" cases.
- **clippy with `--all-targets --all-features`** catches more than the default
  set. Worth the noise.
- **thiserror for lib, anyhow for bin** — the two-crate pattern most Rust
  projects converge on. `thiserror` for typed errors that callers match on;
  `anyhow` for "I just want to bubble it up to main".
