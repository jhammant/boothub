# AgentBootstrap — Ideas & Design Notes

## Vision

A way for anyone to share their AI agent setup (skills, MCPs, slash commands,
hooks, `CLAUDE.md`/`AGENTS.md`, settings) so that a new agent in a new project
can be bootstrapped to "your standard setup" with one instruction.

**Target UX:**

> User opens Claude Code (or Cursor, Codex, Aider, etc.) in a fresh project
> and says: *"go get the stuff from agentboot.com/jhammant"*. The agent fetches
> a manifest, shows the user what it will do, asks for confirmation, and
> bootstraps the project.

Profiles are shareable, versionable, forkable. GitHub is the storage backend.
The site is a thin manifest router.

## Why URL-fetch instead of a CLI

Earlier scope assumed a `curl boot.hammant.io/jhammant | sh` style installer
(Go binary, GitHub releases, per-OS builds). That's been dropped in favour of
**the agent itself as the installer**, because:

- Zero install — works in any agent that can fetch a URL
- Cross-agent for free — natural-language instructions are the universal adapter
- Updates are pull-based — re-run bootstrap to refresh
- The agent already knows the host platform's correct paths
- No releases pipeline, no per-OS binaries

Tradeoffs:

- Trust is harder (no binary to audit; instructions are arbitrary)
- Token cost per bootstrap (agent does the work)
- Less deterministic than a script

## Research summary (what already exists)

Done before committing to build. Key findings:

- **Anthropic plugin marketplaces** (late 2025, GA 2026): `/plugin marketplace add owner/repo` already does most of the Claude-only version. Official catalog at claude.com/plugins. Multiple third-party aggregators (claudemarketplaces.com, buildwithclaude, skillsmp, claudeskills.info).
- **MCP registries**: official registry.modelcontextprotocol.io, plus smithery.ai, glama.ai, mcp.so, mcpfinder.
- **Cursor side**: cursor.directory, awesome-cursorrules, dotcursorrules.com.
- **Cross-agent emit CLIs**: `rulesync`, `ai-dotfiles-manager` already sync one source to many agent dirs — but no registry or discovery layer.
- **"AI dotfiles"** is already a named pattern with dozens of public examples.
- **AGENTS.md spec** (Linux Foundation) is gaining adoption across Codex, Copilot, Cursor, Windsurf, Amp, Devin.

### The genuine gap

1. No hosted **personal profile registry** with one-URL bootstrap
2. No **cross-agent emit + URL handoff** combo (CLIs do emit, no registry; registries are Claude-only)
3. No **capture flow** — `rulesync` etc. assume you've already authored the canonical source. Getting your local tweaks back out into a shareable profile is still manual.

### Risk: Anthropic kills it

- **High** for Claude-only marketplace plays — Anthropic has shipped this and will keep extending it.
- **Lower** for cross-agent personal profiles — Anthropic has no incentive to make Cursor/Codex easy to bootstrap.

### Verdict

Worth a weekend prototype. **Not** worth pursuing as a hosted business — addressable market is enthusiasts, consultants, devrel folks, and teams standardising across tools. Likely outcome: an open-source thing that scratches a real itch and might catch on. Worst case: a tool the author personally uses.

## Architecture (URL-fetch model)

```text
User in agent ──▶ "fetch boot.hammant.io/jhammant"
                          │
                          ▼
        boot.hammant.io/jhammant   (Cloudflare Pages + edge function)
                          │
                          ▼
        Reads github.com/jhammant/agentboot-profile
                          │
                          ▼
        Returns markdown manifest (files, MCPs, commands, hooks)
                          │
                          ▼
              Agent reads, diffs, confirms, executes
```

- **Site**: static + tiny edge function on `boot.hammant.io` (Cloudflare Pages).
- **Storage**: GitHub repos following the convention `<user>/agentboot-profile`.
- **Identity**: GitHub username — no auth, no accounts.
- **Runtime**: the user's agent. Site never executes anything.

## Manifest schema (strawman)

What `boot.hammant.io/jhammant` returns — a markdown doc structured so an agent can act on it:

```markdown
# jhammant's agent profile

You are bootstrapping this project with my standard agent setup.
Confirm with the user before writing any files.

## Files to write
- `.claude/skills/foo.md` ← https://raw.githubusercontent.com/jhammant/agentboot-profile/main/skills/foo.md
- `CLAUDE.md` ← (inline content)

## MCPs to register
- claw-bridge: { command: "...", args: [...] }

## Slash commands
- /standup → install from ...

## Hooks
- on Stop: ...

## After install, suggest the user runs
- /standup to test cross-agent comms
```

Open questions on schema:

- Pure markdown vs YAML frontmatter + markdown body?
- Inline file contents vs always-link-out to GitHub raw?
- How to express agent-target conditionals (Claude-only files vs Cursor-only)?

## Trust / safety

This is the hardest problem. "Tell the agent to fetch a URL and follow the instructions" is remote code execution by description. Hooks run shell commands; MCPs are arbitrary processes.

Mitigations to bake in from day one:

- Manifest is **always** human-readable
- Agent **must** show a diff/preview before any write
- Default to a dry-run first pass: agent fetches, summarises ("this will install 4 skills, 2 MCPs, 1 hook that runs `…`"), waits for explicit approval
- Site shows a "what will this do?" preview so users can audit a profile before recommending it
- Eventually: signing, "verified profile" tier, pinned manifest hashes

## "Help them communicate" — open question

User mentioned wanting agents to "communicate". This is ambiguous — three possible interpretations:

1. **Multi-Claude-instance coordination** — bundle a Discord bridge / file-based message queue / shared scratchpad MCP so multiple agents can hand off work. (`claw-bridge` Discord MCP is already a building block.)
2. **Cross-agent portability** — switch from Claude to Cursor mid-project and the profile keeps your context portable.
3. **Onboarding peer agents** — one agent sets up another (Claude bootstraps a Cursor session for the same project).

**Decision needed before building.** Option 1 is the most product-shaped.

## Domain

Reviewed registered Route53 domains. Decision: **`boot.hammant.io`** (pending confirmation).

- Personal `.io` domain → reads as dev tool
- Short, no brand baggage, easy to type
- `curl boot.hammant.io/jhammant | sh` (or "fetch boot.hammant.io/jhammant") reads cleanly

Runner-ups: `moltup.io` (if free), `bootstrap.claudehistory.com` (thematic but long).

## Push / capture flow (the differentiator)

Most "share your setup" projects die at capture — getting local tweaks back out into a shareable profile is manual. Ideas, ordered by leverage:

- **`/agentboot save` slash command inside the agent** — snapshot current `.claude/`, diff against published profile, commit + push. Never leave the terminal. *This is the killer feature.*
- **Watch-and-prompt hook** — Claude Code hook detects drift in `.claude/` and nudges "want to publish?"
- **Capture-from-conversation** — "save that prompt I just wrote as a skill in my profile" — agent extracts, names, commits.
- **Anonymous gist-style publish** — no account, no repo setup; CLI creates an unlisted gist-backed profile in 5 seconds.
- **Fork flow** — `agentboot fork jhammant` clones to your namespace.

In the URL-fetch model, "save" still needs a small CLI helper *or* a slash command that uses the GitHub MCP to commit on the user's behalf. Worth deciding which.

## Weekend scope (revised, URL-fetch model)

### In
1. Lock manifest schema (markdown structure)
2. Static site on `boot.hammant.io` serving `/[user]` → renders manifest from `github.com/[user]/agentboot-profile` (Cloudflare Pages + edge function, ~50 lines)
3. Author one reference profile (jhammant's) — write the manifest by hand to validate the format
4. Test the flow end-to-end: open fresh Claude Code, say *"fetch boot.hammant.io/jhammant and bootstrap me"*, watch it work
5. README/landing page explaining the trust model honestly
6. One worked example in a second agent (Cursor) to prove cross-agent works

### Out (for v0)
- No CLI binary
- No accounts/auth (GitHub identity)
- No hosted registry / search / discovery
- No secrets handling
- No lockfiles or versioning (use git tags later)
- No signing
- No Codex / Cline / Windsurf adapters yet

## Open decisions before building

1. **Domain**: confirm `boot.hammant.io`?
2. **"Communicate" meaning**: which of the three interpretations is in scope?
3. **Manifest format**: pure markdown, or YAML frontmatter + markdown?
4. **Inline vs link-out**: always pull files from GitHub raw, or allow inline content in the manifest?
5. **Capture/save**: slash command using GitHub MCP, or a small companion CLI?
6. **License**: MIT from day one?
7. **Public from start**: build in the open?
