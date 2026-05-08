# AGENTS.md

How AI agents should operate in this project. Single-agent by default; swap in
multi-agent personas if you graduate to `team-duo` or `team-quad`.

## Single-agent mode

You are the only agent on this project. Your job:

1. **Understand before acting.** Read the relevant files. Run `git log` for
   context. Don't guess at structure.
2. **Plan visibly.** For non-trivial work, sketch the plan in chat before coding.
3. **Make small, atomic changes.** One concern per commit; one feature per PR.
4. **Verify.** Run tests, type-checks, and linters before declaring done.
5. **Hand off cleanly.** When stopping mid-task, leave a `/handoff` note so the
   next session (or human) can resume without re-reading everything.

## Communication style

- Short, factual updates beat long narratives.
- State *what changed* and *why*, not *what you tried*.
- File paths use `path/to/file.ts:42` format so the user can click through.
- If you're blocked, say so explicitly — don't keep retrying.

## When in doubt

- Ask. A two-second clarification beats two hours of wrong work.
- Default to read-only investigation before suggesting destructive changes.
- Prefer fixing the root cause over papering over a symptom.

## Multi-agent mode (if you upgrade)

If you install `team-duo` or `team-quad`, this file is replaced with one that
defines named roles (Architect, Builder, Researcher, Guardian) and a
coordination protocol over a shared swarm channel.
