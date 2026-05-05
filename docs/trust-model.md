# Trust model

Telling an agent to fetch a URL and follow its instructions is **remote code execution by description**. boothub's whole job is to make that safe by:

1. Keeping the renderer dumb (no execution server-side).
2. Forcing per-bundle, human-visible diff approval client-side.
3. Sandboxing variable substitution.
4. Bounding what URLs a manifest can reference to.

## Site responsibilities (boothub.dev itself)

- Fetch only from `raw.githubusercontent.com/<owner>/boothub-profile/<ref>/`.
- Validate the manifest against the schema before responding.
- Never execute hooks, MCP commands, or file content.
- Never hold the user's secrets.

## Agent responsibilities (your AI agent)

A boothub-honoring agent MUST:

- Show the user the human-readable summary at the top of the manifest body before doing anything.
- Build a per-bundle plan and show a diff for each.
- For `files`: list every path that would be written, with content preview.
- For `mcp`: show the literal command + args + env after substitution.
- For `hooks`: show event, matcher, and the literal shell command.
- Wait for explicit per-bundle approval. ("Approve all" is fine if the user opted into it.)
- Never write outside the project root or the agent config dir (`~/.claude/`, `.cursor/`, etc.).
- For `secrets`: only attempt decryption if the user's age key is present locally; never request keys via the manifest.

## What the manifest CANNOT do

- Reference URLs outside its own profile repo (rejected by the renderer).
- Embed arbitrary template expressions (only declared `template_vars` are substituted).
- Modify the agent's behavior beyond what's installed by the bundle (no plugin system).

## What the manifest CAN do (and you should watch for)

- Convince a careless user to approve a hook that runs destructive shell commands.
- Set up an MCP whose process exfiltrates files.
- Inline malicious content in `files: [{path, content}]`.

These are the same risks as installing any unverified script. Mitigation: read the diff. Don't approve bundles you don't understand.

## Reporting abuse

If a profile abuses the trust model (e.g., a deceptive manifest), open an issue at [github.com/jhammant/boothub](https://github.com/jhammant/boothub/issues). We can flag profiles in our renderer.
