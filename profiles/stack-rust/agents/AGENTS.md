# AGENTS.md

Agent-facing addendum for **Rust** projects. Lives alongside CLAUDE.md.

## Commands you'll use

| What | Command |
|---|---|
| Build | `cargo build` (or `cargo build --release` for perf-sensitive checks) |
| Build all targets | `cargo build --all-targets --all-features` |
| Format-check | `cargo fmt --all -- --check` |
| Format (apply) | `cargo fmt --all` |
| Lint | `cargo clippy --all-targets --all-features -- -D warnings` |
| Test | `cargo test --all-features` |
| Test (single) | `cargo test --test <integration> -- <name>` or `cargo test <name>` |
| Doc-tests | `cargo test --doc` |
| Add dep | `cargo add <crate>` (after flagging) |

## What "passing" means

```bash
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all-features
```

All three return 0. Don't claim done until all three pass.

## Warnings that block

- Any clippy warning under `-D warnings`.
- Any test failure (including doc-tests).
- A new `unwrap()` / `expect()` in library code without justification.
- A new `unsafe` block (always flag unsafe; not auto-block but always discuss).
- A test marked `#[ignore]` in your changes (without reason + owner).

## Warnings that don't block but get a `[risk]` note

- A new `pub` item that probably should be `pub(crate)`.
- A new dependency that overlaps something already in `Cargo.toml`.
- `#[allow(clippy::...)]` you had to add, even with a comment.
- A function over ~50 lines — likely should be split.

## Investigation cheat-sheet

```bash
# Workspace or single crate?
cat Cargo.toml | grep -A5 '\[workspace\]'

# What's the MSRV?
grep -E '^rust-version|edition' Cargo.toml

# What features exist?
cargo metadata --format-version 1 | jq '.packages[] | select(.name=="<crate>") | .features'

# Find error type pattern
grep -rn "thiserror\|anyhow" src/

# Find unwrap usage in lib code
grep -rn "\.unwrap()\|\.expect(" src/ | grep -v "^.*test"
```

## Don't

- Don't `cargo update` unless asked. Lockfile bumps belong in their own PR.
- Don't bump rust edition without flagging.
- Don't add `unsafe` to fix a borrow-checker complaint — restructure instead.
- Don't suppress clippy with `#[allow(...)]` to make a build go through.
  Either fix the issue or write a `[blocker]` note explaining why allowing is correct.
- Don't reformat unrelated files. `cargo fmt` on the whole workspace can
  produce noisy diffs if formatter version drifted; commit your changes
  separately from any formatter cleanup.
