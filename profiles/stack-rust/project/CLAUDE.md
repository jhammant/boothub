# CLAUDE.md

Project instructions for AI agents working on this **Rust** project.

## What this project is

(Replace this paragraph: what the code does, who uses it, what success looks
like.)

## The trinity

Every change must pass:

```bash
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all-features
```

If any of those fail, the change isn't done. Don't merge clippy-allowed
warnings without a reason — `#[allow(clippy::...)]` needs a comment.

## Error handling

- **Libraries: `thiserror`.** One enum per crate (or per module if it grows).
  Errors implement `std::error::Error` automatically. Callers match on variants.
- **Binaries / scripts: `anyhow`.** `Result<T, anyhow::Error>` and `?` to
  bubble up. Add context with `.context("loading config")?`.
- **No `unwrap()` / `expect()` in library code.** Use `?`, or return a typed
  error. Panics are for "the program logic is wrong", not "the input was bad".
- **`unwrap()` in tests is fine.** Tests fail loudly; that's the point.
- **`expect()` in `main()` for setup is fine.** Failing fast on missing config
  is appropriate.

## Type discipline

- **Avoid `String` for things that aren't user-facing text.** Use a `NewType`
  (`UserId(String)`), or `&str` if the lifetime is clear, or `Cow<str>` for
  the cases where ownership varies.
- **Lifetimes elided where the compiler is happy.** Don't add explicit
  lifetimes for visual clarity — they're noise. Only when the compiler asks.
- **Prefer iterators over indexed loops.** `.map().filter().collect()` reads
  better than `for i in 0..vec.len()`.
- **`?` over `match` for plain forwarding.** `let x = thing()?;` not a
  4-line match that returns the error.

## Module structure

- **`mod foo;` declarations live at the top of `lib.rs` / `main.rs`** (or the
  parent `mod.rs` if you're using the older layout).
- **`pub use` to flatten the API.** Internal module structure shouldn't leak
  to consumers.
- **Feature-gate optional functionality.** Don't pull in heavy deps as
  required when 80% of users won't use them.

## Testing

- **Unit tests in `#[cfg(test)] mod tests` at the bottom of the file** they
  test. Integration tests in `tests/`.
- **No flaky tests.** A test that fails 1 in 100 runs is broken; fix or skip
  it (with reason + owner).
- **`cargo test --doc`** to verify doc-tests too. Doctests rot fast.
- **`#[should_panic]` is fine, `#[should_panic(expected = "...")]` is better.**

## Async

- **Pick one runtime per binary.** tokio or async-std, not both.
- **`async fn` traits via `async-trait` crate** unless on nightly with native
  support.
- **No `block_on` inside async code.** That's a footgun.

## What I won't do without asking

- Add a new dependency.
- Bump rust edition or MSRV.
- Disable a clippy lint.
- Use `unsafe` in a new place.
- Change `Cargo.lock` (regenerate yes; manually edit no).

## Project-specific notes

(Build commands, deploy notes, gotchas. e.g. "MSRV is 1.78"; "release builds
with `--locked` in CI"; etc.)
