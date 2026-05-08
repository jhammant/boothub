---
description: Append a quick note to the project journal
---

# /note

Append a short note to `.notes/journal.md` with:

- ISO timestamp
- Author (your agent name, or "claude" if unset)
- Body (whatever the user passes after `/note`)

Format:

```markdown
## 2026-05-08T12:34:56Z — claude
The bug in auth.ts:42 was a stale session token. Fixed by clearing on logout.
```

If `.notes/journal.md` doesn't exist, create it with a header explaining what
it's for ("project journal — append-only running record of decisions, finds,
and gotchas").

Don't restructure or rewrite earlier entries. Append-only.
