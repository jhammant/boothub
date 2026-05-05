# Manifest spec (v1)

A boothub profile is a GitHub repo named `<USERNAME>/boothub-profile` with a `MANIFEST.md` file at its root. The manifest is YAML frontmatter + markdown body, served verbatim (after preset filtering) at `boothub.dev/<USERNAME>[/<PRESET>]`.

## Top-level fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `boothub` | `1` | yes | schema version literal |
| `profile` | string | yes | typically the GitHub username |
| `source` | URL | yes | `https://github.com/USER/boothub-profile` |
| `targets` | `[Target]` | yes | which agents this profile supports |
| `summary` | string | yes | shown to humans before any write |
| `presets` | `{name: [bundleId]}` | yes | each preset names which bundles to include |
| `bundles` | `[Bundle]` | yes | the installable atoms |
| `generated` | ISO date-time | no | for caching/version display |
| `post_install` | `[string]` | no | suggestions to surface after install |

`Target` is one of: `claude-code`, `cursor`, `codex`, `aider`, `windsurf`, `cline`.

## Bundles

A bundle is the atomic unit of install. Three kinds: `files`, `mcp`, `hooks`.

### Common fields (every bundle)

| Field | Type | Required |
|---|---|---|
| `id` | kebab-case string | yes |
| `kind` | `files` / `mcp` / `hooks` | yes |
| `only-on` | `Target` or `[Target]` | no |
| `post` | string | no |

### `files` bundle

```yaml
- id: skills
  kind: files
  files:
    - { path: .claude/skills/standup.md, from: skills/standup.md }
    - { path: CLAUDE.md, content: "inline body…" }
```

Each entry needs **either** `from` (a path relative to the profile repo, resolved to a GitHub raw URL by the renderer) **or** `content` (inline string). Not both.

### `mcp` bundle

```yaml
- id: claude-history
  kind: mcp
  mcp:
    claude-code:
      scope: user      # user | project | local
      config: { command: "node", args: ["{{HOME}}/x/y.js"] }
    cursor:
      config: { command: "node", args: ["{{HOME}}/x/y.js"] }
  template_vars: [HOME]
  env_required: [CLAUDE_HISTORY_CLOUD_TOKEN]
  secrets:
    CLAUDE_HISTORY_CLOUD_TOKEN: |
      -----BEGIN AGE ENCRYPTED FILE-----
      …
      -----END AGE ENCRYPTED FILE-----
```

The `mcp` map is keyed by target — agents pick the entry matching their platform.

### `hooks` bundle

```yaml
- id: format
  kind: hooks
  only-on: claude-code
  hooks:
    - { event: PostToolUse, matcher: "Write|Edit", command: "{{PROJECT_ROOT}}/scripts/format.sh" }
  template_vars: [PROJECT_ROOT]
```

## Templating

`template_vars` declares which variables the bundle expects. The agent substitutes only those, only into the values of the relevant fields. There is no general expression evaluation.

Standard vars:
- `{{HOME}}` — user's home directory
- `{{PROJECT_ROOT}}` — git root of the current project (or cwd)

Profiles MAY introduce their own; the agent SHOULD prompt the user when a non-standard var is encountered.

## URL grammar

| URL | Meaning |
|---|---|
| `boothub.dev/USERNAME` | default preset (named `default`) |
| `boothub.dev/USERNAME/PRESET` | the named preset (404 if missing) |
| `?ref=v1.2` | pin to a tag/branch/sha (default: `main`) |
| `?target=cursor` | filter `only-on` bundles to this target |
| `?nocache=1` | bypass edge cache |

## Validation

Validate locally:

```bash
npx tsx tools/validate.ts path/to/MANIFEST.md
```

The schema is in `schema/manifest.schema.json` (JSON Schema 2020-12) and `lib/schema.ts` (zod). They must stay in sync.
