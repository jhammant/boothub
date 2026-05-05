---
name: boothub-save
description: Capture local agent customisations (skills, commands, hooks, MCP configs) into your boothub-profile repo, normalise paths, commit, and push.
---

# /boothub save

Capture changes from your local agent config into your published `boothub-profile` repo so they're available next time someone fetches `boothub.dev/$YOU`.

This command runs idempotently — re-running with no changes is a no-op.

## Where things go

| Local source | Profile destination |
|---|---|
| `~/.claude/skills/*.md`, `.claude/skills/*.md` | `skills/<name>.md` |
| `~/.claude/commands/*.md`, `.claude/commands/*.md` | `commands/<name>.md` |
| `~/.claude/agents/<agent>/SOUL.md` | `agents/<agent>/SOUL.md` |
| `~/.claude/hooks/*` | `hooks/<name>` (with `MANIFEST.md` hook entry) |
| `.mcp.json` MCP server entries | `mcps/<name>.yaml` (with `MANIFEST.md` mcp bundle entry) |
| Project root `CLAUDE.md` | `project/CLAUDE.md` |
| Project root `AGENTS.md` | `agents/AGENTS.md` |

## Steps

1. **Locate the profile repo.**
   - Read `~/.config/boothub/profile.json` if present. Expected schema:
     ```json
     { "repo": "git@github.com:USER/boothub-profile.git", "local": "/Users/USER/dev/boothub-profile" }
     ```
   - If absent, prompt the user once: GitHub username + (optional) local clone path. Default local path: `~/dev/boothub-profile`. Save the answer to `~/.config/boothub/profile.json`.
   - If the local path doesn't exist, `git clone` from the configured `repo` URL.

2. **Scan local agent config.**
   - Always: `~/.claude/skills/`, `~/.claude/commands/`, `~/.claude/agents/`, `~/.claude/hooks/`.
   - If we're inside a git repo: also `<project>/.claude/`, `<project>/CLAUDE.md`, `<project>/AGENTS.md`.
   - Read `.mcp.json` if present (in `~/.claude/` and project).
   - Skip: `~/.claude/projects/`, `~/.claude/sessions/`, `~/.claude/cache/`, anything matching `*.log`, `node_modules/`.

3. **Normalise paths in any captured shell scripts or hook commands.**
   - Replace `/Users/$USER` (or `$HOME`) with `{{HOME}}`.
   - Replace project-root absolute paths with `{{PROJECT_ROOT}}`.
   - If a hook references a path outside `~/.claude/` or the project, flag it in the skip-report rather than silently rewriting.

4. **Diff against the existing profile repo.**
   - Run `git -C <local> status --short` and `git -C <local> diff --stat` to show the user what would change.
   - Group changes by destination directory.

5. **Update `MANIFEST.md` to declare the new bundles.**
   - Use existing bundle ids if a file already lives in a known bundle.
   - For new files, add to the most appropriate existing bundle (`skills`, `commands`, etc.).
   - For new MCPs, append a new `mcp` bundle entry.
   - For new hooks, append a new `hooks` bundle entry.
   - Always run `npx tsx tools/validate.ts` (in the boothub repo) on the new MANIFEST before committing.

6. **Emit a skip-report.**
   - Files that couldn't be captured (machine-specific paths, secrets without an age key, binaries, large files >100KB).
   - Suggest manual handling for each.

7. **Show the user a summary** before any git operation:
   ```text
   Will capture into <profile-local>:
     + 2 new skills, 1 modified
     + 1 new command
     + 1 new MCP bundle (claude-history)
   Skipped:
     - ~/.claude/hooks/local-only-thing.sh (path outside HOME/project)
   Manifest validates: ✓
   Commit + push? [y/N]
   ```

8. **On approval**, run:
   ```bash
   git -C <local> add -A
   git -C <local> commit -m "save: <one-line summary of what changed>"
   git -C <local> push
   ```
   Surface the resulting commit hash and the URL: `boothub.dev/<USER>` (or `?ref=<sha>` for the pinned version).

## Optional: tag a release

If the user opts to tag (ask: "tag this snapshot? [y/N] tag name: "), run:

```bash
git -C <local> tag <tagname>
git -C <local> push origin <tagname>
```

Then the immutable URL is `boothub.dev/<USER>?ref=<tagname>`.

## What to NEVER do

- Never overwrite the user's `secrets:` blocks in MANIFEST without explicit approval.
- Never include `~/.claude/sessions/`, `~/.claude/projects/`, or any conversation history.
- Never commit anything matching `*.key`, `*.pem`, `*token*`, `*secret*` content unless it's already age-encrypted.
- Never push without showing the diff first.

## Failure modes

- **No profile repo configured + offline** → fail clearly; don't try to create a new GitHub repo silently.
- **Manifest validation fails** → show the validation error, leave nothing committed, exit non-zero.
- **Push fails (rejected, conflict)** → suggest `git pull --rebase` and re-run.

## Use during execution

Run `/boothub save` after a productive session where you've added or modified skills/commands/hooks. Don't run it after every keystroke — it's a checkpoint, not a sync.
