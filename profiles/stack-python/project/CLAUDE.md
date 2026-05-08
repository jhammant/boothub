# CLAUDE.md

Project instructions for AI agents working on this **Python** project.

## What this project is

(Replace this paragraph: what the code does, who uses it, what success looks
like.)

## Environment + deps

- **uv is the package manager.** Not pip, not poetry, not conda. `uv sync`
  to install, `uv add <pkg>` to add, `uv run <cmd>` to run inside the env.
- **Lockfile is `uv.lock`.** Commit it. Don't regenerate it on every PR.
- **Python version pinned in `pyproject.toml`** under `requires-python`.
  Don't bump without flagging.

## Type discipline

- **Type hints on every function signature.** Public *and* private. If you
  can't type a parameter, the function is doing too much.
- **`mypy --strict` (or `pyright strict`) returns 0.** Treat type errors as
  build failures.
- **No `# type: ignore` without a justifying comment.** `# type: ignore[arg-type]  # third-party stub bug — see #142`.
- **`Any` is a smell.** Use `object` if you really mean "any type"; use
  generics if you mean "preserves type"; use a `Protocol` if you mean
  "something with these methods".
- **Use `TypeAlias` and `NewType`** to give meaningful names to primitives:
  `UserId = NewType("UserId", str)` beats raw `str` everywhere.

## Boundaries are validated

- **Pydantic at every boundary.** HTTP body, env vars, file/JSON loads,
  third-party API responses → pydantic models, parsed once.
- **Use `BaseSettings` for env vars.** Single config module, parsed on import.
  Never read `os.environ.get(...)` ad-hoc deep in business logic.
- **Don't validate again internally.** Once it's a pydantic model, trust it.

## Testing

- **pytest, not unittest.** Fixtures, parametrize, `pytest.raises`.
- **`tests/` mirrors `src/`** (or your package root). One test file per source file.
- **Tests must run with no setup beyond `uv sync`.** No "first run a script".
- **`pytest -x` on green codebase passes in <30s** for unit tests. If it
  takes longer, your "unit" tests are integration tests in disguise.
- **No test order dependence.** Parallelise-able; randomise-able.

## Errors

- **Specific exceptions, not bare `except:`.** `except (KeyError, ValueError):`
  with explicit handling.
- **Don't catch what you can't handle.** If catching means logging and
  re-raising, you don't need the catch.
- **Custom exception classes for your domain.** `class PaymentRefused(Exception)`
  beats raising `ValueError("payment refused")` everywhere.
- **`logger.exception()` (not `logger.error()`)** when you want the traceback
  in the log.

## Imports + structure

- **Absolute imports.** `from myapp.foo import bar`, not `from .foo import bar`
  unless inside a package's `__init__.py`.
- **No `import *`.** Anywhere.
- **Sort imports** with `ruff check --select I --fix` (or isort if you prefer).

## What I won't do without asking

- Add a new dependency.
- Disable a test.
- Loosen mypy/pyright settings.
- Use `# type: ignore` in a new file.
- Change Python version.

## Project-specific notes

(Add stack-specific quirks: `uv run pytest` runs tests; `uv run ruff check`
lints; deploy notes; etc.)
