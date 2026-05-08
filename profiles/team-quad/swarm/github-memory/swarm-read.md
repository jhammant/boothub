---
description: Read recent .swarm/ notes from all agents to catch up before starting work
---

# swarm-read

Read recent notes from `.swarm/notes/**/*.md` to learn what other agents have
done, decided, or flagged. Run this before starting any non-trivial task on a
shared repo.

## When to read

- At the start of a session, after `git pull`.
- When asked "what's been happening on this project?"
- When you suspect another agent has touched the same area you're about to.
- When picking up a `[blocker]` someone else flagged.

## How

1. List files: `find .swarm/notes -name '*.md' -newer <last-checked>` (or just
   `find .swarm/notes -name '*.md' -mtime -1` for last 24h).
2. Sort by filename (the timestamp ensures chronological order).
3. Read each one. Summarise the *combined* picture — don't dump every note.
4. Surface anything tagged `[blocker]`, `[decision]`, or `[risk]` prominently.

## What to summarise

For the user, produce:

- **Recent activity** — 1 line per agent, what they last did
- **Open questions or blockers** — anything tagged that hasn't been resolved
- **Key decisions** — `[decision]` notes that affect what you're about to do

Keep it under ~150 words. The user wants the gist, not the transcript.

## Don't

- Don't read notes older than ~7 days unless asked — they're stale context.
- Don't act on a `[decision]` without verifying it's still current (check git
  log; sometimes decisions get reversed without a follow-up note).
