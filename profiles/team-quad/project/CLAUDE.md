# CLAUDE.md

Project instructions for AI agents in a **four-persona swarm**
(Architect + Builder + Researcher + Guardian).

## What this project is

(Replace this paragraph: what the code does, who uses it, what success looks
like. All four personas read this first.)

## Personas

- **Architect** (`.agents/architect.md`) — decides what + why
- **Builder** (`.agents/builder.md`) — implements, tests, commits
- **Researcher** (`.agents/researcher.md`) — investigates, surveys, summarises
- **Guardian** (`.agents/guardian.md`) — reviews, blocks on regressions

Each agent reads its own role file, then announces itself in a `[brief]` note.

## Coordination protocol

1. **Architect** opens with a `[research-request]` (when needed) → Researcher
   responds with `[findings]`.
2. **Architect** writes a `[decision]` note based on findings.
3. **Builder** implements; emits `[push]` notes per commit.
4. **Guardian** reviews `[push]` notes; emits `[approve]` or `[block]`.
5. **Architect** marks `[done]` once Guardian has cleared it.

Read `.swarm/README.md` for the channel mechanics; read `AGENTS.md` for the
full tag taxonomy.

## Conventions (project-wide)

- **Commits**: short imperative subject; body explains *why*.
- **Branches**: `feat/`, `fix/`, `chore/`, `docs/` prefixes.
- **PRs**: one logical change per PR; reference issues with "Closes #123".
- **Tests**: write tests for new behaviour and for any bug being fixed.

## Don't do

- Don't blur roles. Researcher writing code or Builder making architecture
  calls breaks the protocol's value.
- Don't bypass Guardian — `[block]` notes are binding until resolved.
- Don't commit secrets, API keys, or `.env` files.

## Project-specific notes

(Add stack-specific quirks here.)
