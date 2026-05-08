# AGENTS.md

Agent-facing addendum for **Python** projects. Lives alongside CLAUDE.md.

## Commands you'll use

| What | Command |
|---|---|
| Install | `uv sync` |
| Add a dep | `uv add <package>` (after flagging it to the user) |
| Run anything | `uv run <command>` (it activates the env) |
| Type-check | `uv run mypy .` or `uv run pyright` |
| Test | `uv run pytest` |
| Test (single file) | `uv run pytest tests/test_x.py` |
| Test (single test) | `uv run pytest tests/test_x.py::test_name` |
| Lint | `uv run ruff check .` |
| Format | `uv run ruff format .` |

If a command isn't defined in `pyproject.toml` or as an installed dev-dep,
don't fabricate it — read the project first.

## What "passing" means

- `uv run mypy .` (or pyright equivalent) returns 0.
- `uv run pytest` is fully green.
- `uv run ruff check .` returns 0 (if ruff is configured).
- No new `# type: ignore` introduced (unless paired with a justifying comment).

## Warnings that block

- Any mypy/pyright error in changed files.
- A test marked `@pytest.mark.skip` or `xfail` in your changes (without a
  reason and an owner).
- A new bare `except:` or `except Exception:` without justification.
- A new `Any` annotation in a public signature.

## Warnings that don't block but get a `[risk]` note

- A `pytest.fixture` with `autouse=True` introduced — implicit dependencies are nasty.
- A test that takes >1s — likely doing real I/O.
- A new top-level dependency that overlaps something already in `pyproject.toml`.

## Investigation cheat-sheet

```bash
# What's the package manager?
ls uv.lock poetry.lock requirements.txt 2>/dev/null

# Type-checking config?
grep -A20 'tool.mypy\|tool.pyright' pyproject.toml

# Test runner config?
grep -A10 'tool.pytest' pyproject.toml

# Find the boundary validators
grep -rn "BaseModel\|BaseSettings" src/ | head
```

## Don't

- Don't `pip install` anything. Use `uv add`.
- Don't bump Python version without flagging.
- Don't run `uv lock --upgrade` (mass dep bump) unless asked.
- Don't reformat files you didn't intend to change — diff hygiene matters.
- Don't add `__init__.py` files unless you actually need package init logic.
