---
description: Write a note to the .swarm/ shared memory (other agents read these)
---

# swarm-write

Append a note to `.swarm/notes/<agent-id>/<iso-timestamp>.md` so other agents
on this repo can see what you've done and decided.

## When to write

- After a non-trivial decision: which approach you picked and why.
- When you push code: what the change does, which files matter.
- When blocked: what's stuck, what would unblock you.
- At the end of a session: short status (`[brief]` tag).

## Format

```markdown
[<tag>] one-line summary

(optional 1-3 sentence body — context, file references, "why this matters")
```

## How

1. Determine your agent-id (default: `claude`; override with `BOOTHUB_AGENT` env var).
2. Construct path: `.swarm/notes/<agent-id>/<YYYY-MM-DDTHH-MM-SSZ>.md`
3. Create parent dir if missing.
4. Write the note.
5. Stage + commit: `git add .swarm/ && git commit -m "swarm: <tag> <summary>"`

(Don't push automatically — let the user push when they're ready.)

## Don't

- Don't overwrite or edit existing notes (yours or others').
- Don't write transcripts of the whole session — that's `.notes/journal.md`.
- Don't include secrets, tokens, or PII.
