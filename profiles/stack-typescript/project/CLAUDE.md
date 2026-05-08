# CLAUDE.md

Project instructions for AI agents working on this **TypeScript** project.

## What this project is

(Replace this paragraph: what the code does, who uses it, what success looks
like. Agents read this first.)

## Type discipline

- **Strict mode is on.** `tsconfig.json` should have `"strict": true`. Don't
  weaken it with `--noImplicitAny false` etc.
- **No `any` without a comment.** If you must use `any`, write a one-line
  comment on the same line: `const x: any = …; // unknown shape from <source>`.
- **No `as` casts to bypass type errors.** Casts are for narrowing real
  ambiguity. If you're casting because TS is "wrong", you're probably wrong.
- **Use `unknown` over `any`** when the type is genuinely unknown — it forces
  narrowing at use sites, which is what `any` was hiding.
- **Prefer discriminated unions over enums.** `type Result = { ok: true; value: T } | { ok: false; error: E }` reads better and narrows better than enum hacks.

## Boundaries are validated

- **Validate every external input at the boundary.** HTTP body, env vars, IPC,
  file content, third-party API responses → zod (or your validator of choice).
- **Don't validate again internally.** Once it's typed at the boundary, trust
  the type. Re-validation is a smell — it means the boundary type is wrong.
- **Env vars: parse once on boot.** Use `z.object({...}).parse(process.env)`
  in a single config module. Never read `process.env.X` ad-hoc.

## Testing

- **vitest by default.** Faster, ESM-native, drop-in for jest's API.
- **Co-locate tests** as `*.test.ts` next to source, or in `tests/` mirroring
  the src tree — pick one and stick to it.
- **Tests must run with no setup.** No "first run `npm run setup`". `npm test`
  works on a fresh clone after `npm install`.
- **Each test independent.** No shared state between tests. No test order dependence.
- **Test the public surface.** Don't test private helpers — test the contract.

## Async + errors

- **Use `async/await`, not `.then()` chains.** Easier to read, easier to
  attribute errors.
- **Don't swallow errors.** `try { ... } catch {}` with no handling is a bug.
- **Throw `Error` subclasses, not strings.** Custom errors get a `name`,
  `message`, and ideally a `code` field for programmatic handling.
- **Never reject promises with non-Errors.** `Promise.reject(new Error("..."))`,
  not `Promise.reject("...")`.

## Modules + imports

- **Prefer named exports.** Default exports break refactoring; named exports
  give you autoimport that actually works.
- **No circular imports.** Vitest will warn; treat warnings as failures.
- **Keep imports flat.** `import { x } from "./foo"`, not deep relative chains
  like `../../../utils/foo`. Use a path alias (`@/`) or restructure.

## What I won't do without asking

- Add a new dependency.
- Change `tsconfig.json` strictness.
- Disable a test (use `it.skip` only with a `// TODO(<owner>): <reason>` comment).
- Use `any` in a new file.
- Bypass `--no-verify` on commit hooks.

## Project-specific notes

(Build commands, deploy notes, gotchas. e.g. `npm run build` invokes
`tsc -b && vite build`; tests run in CI on Node 22.)
