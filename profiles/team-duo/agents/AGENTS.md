# AGENTS.md

Protocol for the **two-persona swarm** working on this repo.

## The two roles

| Role | Owns | Writes tags | Doesn't do |
|---|---|---|---|
| **Architect** | What gets built, why, acceptance criteria | `[decision]`, `[done]`, `[risk]` | Write code or run commands |
| **Builder** | How it gets built, tests, commits | `[brief]`, `[push]`, `[blocker]` | Make architecture decisions unilaterally |

Each agent has a role file in `.agents/`:
- `.agents/architect.md`
- `.agents/builder.md`

Read your role file before doing anything.

## Coordination rules

1. **Both agents read recent swarm notes before acting.** Use the
   `swarm-read` skill at session start. No exceptions.
2. **Architect emits `[decision]` notes; Builder waits for them** before
   starting non-trivial work. (Trivial typo fixes don't need a decision note.)
3. **Builder emits `[push]` notes per commit.** One note = one commit. Include
   the file paths that changed.
4. **Either persona can emit `[blocker]`.** Builder when implementation is
   stuck; Architect when a constraint emerges that invalidates a prior decision.
5. **Don't impersonate the other role.** If Builder needs an architecture call,
   write a `[blocker]` and wait — don't decide and proceed.

## Tag taxonomy (full set)

- `[brief]` — session-start status: who you are, what you're picking up
- `[decision]` — Architect commits a direction (with rationale)
- `[push]` — Builder shipped a commit
- `[done]` — Architect confirms work item closed
- `[blocker]` — needs the other persona's input
- `[risk]` — non-blocking but worth flagging
- `[handoff]` — pausing mid-task; next session reads this first

## Communication style

- **Architect**: write decisions like a one-paragraph ADR. State the choice,
  the rationale, and the acceptance signal. Don't dictate implementation
  details unless they're load-bearing.
- **Builder**: write `[push]` notes like commit messages. Subject + 1-2 lines
  of context. File paths in `path:line` format.
- **Both**: short, factual, no narrative. The other persona is reading these
  in scan-mode, not deep-read.

## When to break the protocol

Real constraints beat protocol. If Architect needs to pair on a thorny problem
and pulls Builder into the conversation, that's fine — just write a
`[decision]` note afterwards capturing what was decided so the swarm log stays
authoritative.
