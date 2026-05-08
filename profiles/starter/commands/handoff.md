---
description: Write a handoff note so the next session can resume without re-reading everything
---

# /handoff

Drop a short handoff note into `.notes/handoff-<timestamp>.md` summarising:

1. **Goal** — what was being worked on (one sentence)
2. **State** — what's done, what's in-progress, what's blocked
3. **Next step** — the literal next thing to do (commit message, file to edit, command to run)
4. **Open questions** — anything ambiguous that needs human input

Keep it under ~200 words. The point is to let a fresh session pick up cold,
not to chronicle the whole conversation.

After writing, print the file path so the user can review or commit it.
