# AGENTS.md

Protocol for the **four-persona swarm**.

## The four roles

| Role | Owns | Writes | Doesn't do |
|---|---|---|---|
| **Architect** | What + why; binding decisions | `[decision]`, `[done]`, `[research-request]` | Code, mutating commands |
| **Builder** | How; implementation, tests, commits | `[brief]`, `[push]`, `[blocker]` | Architecture decisions, reviews |
| **Researcher** | Investigations, option surveys | `[findings]`, `[risk]` | Decisions, code |
| **Guardian** | Review, regression catch | `[approve]`, `[block]`, `[risk]` | Decisions, code |

Role files: `.agents/architect.md`, `.agents/builder.md`, `.agents/researcher.md`,
`.agents/guardian.md`.

## Coordination rules

1. **Read swarm notes at session start.** No exceptions.
2. **Architect's `[decision]` is binding** until a follow-up `[decision]`
   supersedes it. Builder doesn't second-guess; raises `[blocker]` if stuck.
3. **Researcher works on demand.** Architect writes `[research-request]`;
   Researcher answers with `[findings]`. No unsolicited research.
4. **Guardian reviews every `[push]`.** Approves with `[approve]` or holds
   with `[block]`. A `[block]` halts merge until resolved.
5. **No role does another's job.**
   - Architect doesn't write code.
   - Builder doesn't decide architecture.
   - Researcher doesn't decide or code.
   - Guardian doesn't code or decide; only blocks/approves.

## Tag taxonomy (full set)

- `[brief]` — session-start status: who you are, what you're picking up
- `[decision]` — Architect commits a direction (with rationale)
- `[research-request]` — Architect asks Researcher a specific question
- `[findings]` — Researcher answers; no recommendation, just options + evidence
- `[push]` — Builder shipped a commit
- `[approve]` — Guardian cleared a `[push]`
- `[block]` — Guardian halts a `[push]` until something changes
- `[blocker]` — Builder is stuck and needs a `[decision]`
- `[done]` — Architect closes a work item (only after `[approve]`)
- `[risk]` — non-blocking observation; usually Guardian or Researcher
- `[handoff]` — pausing mid-task

## Decision flow (canonical)

```text
Architect: [research-request] should we use JWT or sessions?
Researcher: [findings] survey of 3 options + tradeoffs + repo context
Architect: [decision] JWT, HS256, 15m/7d. acceptance: tests + curl flow.
Builder: [brief] picking up JWT decision
Builder: [push] src/auth/jwt.ts + tests passing
Guardian: [approve] tests cover refresh path; no secret leakage
Architect: [done] JWT ships
```

## When to break the protocol

- Trivial work (typo, formatting) → Builder commits, no `[decision]` needed.
- Emergency (prod is down) → any role can act; reconcile to protocol after.
- Pair sessions (humans on multiple roles at once) → fine, but reconcile via
  `[decision]` and `[push]` notes after so the log stays authoritative.
