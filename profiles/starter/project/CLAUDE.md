# CLAUDE.md

Project instructions for AI agents working in this repo. Customise this file —
it's a starting point, not a frozen template.

## What this project is

(Replace this line with a one-paragraph description: what the code does, who
uses it, what success looks like. Agents read this first; vague descriptions
produce vague work.)

## Conventions

- **Commits**: short imperative subject (≤72 chars), body explains *why*, not *what*.
- **Branches**: `feat/`, `fix/`, `chore/`, `docs/` prefixes.
- **PRs**: one logical change per PR; reference issues with "Closes #123".
- **Tests**: write tests for new behaviour and for any bug being fixed.
- **Comments**: only when *why* is non-obvious. Don't restate what code does.

## Don't do

- Don't add features, error handling, or abstractions beyond what the task asks.
- Don't introduce new dependencies without flagging them.
- Don't commit secrets, API keys, or `.env` files.
- Don't bypass pre-commit hooks (`--no-verify`) without saying so.

## Workflow

1. Read the issue or task before touching code.
2. Plan briefly (in chat or in a comment) before large changes.
3. Make the smallest change that accomplishes the goal.
4. Run tests and any linter / formatter the project provides.
5. Open a PR with a description that explains the *why*.

## Project-specific notes

(Add stack-specific quirks here: build commands, deploy notes, gotchas.
Examples: "tests run via `npm test` against a local Postgres at port 5433",
"deploys auto-trigger on push to `main`", "secrets live in 1Password under
'project-x'".)
