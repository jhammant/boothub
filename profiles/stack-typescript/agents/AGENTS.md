# AGENTS.md

Agent-facing addendum for **TypeScript** projects. Lives alongside CLAUDE.md.

## Commands you'll use

| What | Command |
|---|---|
| Install | `npm install` (or `pnpm`/`bun` — match the lockfile that exists) |
| Type-check | `npx tsc --noEmit` |
| Test | `npm test` (vitest) or `npx vitest run` |
| Test (single file) | `npx vitest run path/to/file.test.ts` |
| Lint | `npm run lint` if defined; else don't invent one |
| Build | `npm run build` if defined |

If `npm run X` doesn't exist, don't fabricate it — read `package.json` first.

## What "passing" means

- `npx tsc --noEmit` returns 0.
- `npm test` is fully green.
- Lint (if configured) returns 0.
- No new `// @ts-ignore` or `// @ts-expect-error` introduced (unless paired
  with a comment explaining what's expected and why).

## Warnings that block

- Any TS error. There are no "harmless" TS errors.
- A test marked `.skip` or `.todo` in your changes (without an owner + reason).
- A new `any` without a justifying inline comment.

## Warnings that don't block but get a `[risk]` note

- Un-narrowed `unknown` at a function boundary that *could* be tighter.
- New dependency that overlaps something already in `package.json`.
- A test that runs >2s — likely doing real I/O it shouldn't.

## Investigation cheat-sheet

```bash
# What's the test framework?
cat package.json | jq '.devDependencies | keys'

# What's the build pipeline?
cat package.json | jq '.scripts'

# Strictness level?
cat tsconfig.json | jq '.compilerOptions | {strict, noImplicitAny, strictNullChecks}'

# Find the boundary validators
grep -r "z\.object\|z\.parse" src/ | head
```

## Don't

- Don't `npm install` a new dep without flagging it first.
- Don't run `npm audit fix --force`.
- Don't change Node version (`.nvmrc`, engines field) without flagging.
- Don't reformat files you didn't intend to change — your editor's
  format-on-save will do that and produce a noisy diff.
