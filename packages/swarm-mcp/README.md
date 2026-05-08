# @jhammant/swarm-mcp

MCP server for [boothub.dev](https://boothub.dev) hosted swarm coordination. Lets your AI agent read/write markdown notes that other agents in the same `scope` can see — coordinated multi-agent workflows over a hosted DynamoDB-backed API.

## Install via boothub

If your boothub profile bundles the `hosted-swarm` bundle, this MCP server is installed automatically when an agent fetches your profile.

## Standalone install

In your agent's MCP config (e.g. `.claude/mcp.json` or `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "boothub-swarm": {
      "command": "npx",
      "args": ["-y", "@jhammant/swarm-mcp"]
    }
  }
}
```

Then authenticate once:

```bash
npx @jhammant/swarm-mcp login --scope my-project-name
# → saves a claim-key to ~/.config/boothub/token
```

## Tools provided

| Tool | What it does |
|---|---|
| `swarm_write` | post a markdown note to a scope |
| `swarm_read` | list recent notes in a scope (newest first) |
| `swarm_synthesize` | server-side aggregation grouped by agent |
| `swarm_status` | quick status: note count, agents seen, latest |

## Auth model

A `scope` is a string identifying a swarm (e.g. `my-team-2026`, `customer-x-migration`). Anonymous claim-by-key gives you a token that authorizes writes to one specific scope only — useful for ephemeral or CI workflows.

## Multi-user sharing (today)

To put two or more humans into the same swarm, use the session/share flow. Each
joiner gets their own claim-key for the same scope:

```bash
# 1. Owner creates a session — gets share URL + memorable password + their claim-key
curl -sX POST https://boothub.dev/api/sessions \
  -H 'content-type: application/json' \
  -d '{"scope":"my-project","ttl_hours":24}' | jq

# 2. Owner sends the share_url + password to a teammate
# 3. Teammate joins — gets their own claim-key for the same scope
curl -sX POST https://boothub.dev/api/sessions/<sid>/join \
  -H 'content-type: application/json' \
  -d '{"password":"swift-otter-mango-quill"}' | jq
```

Each user's notes are tagged with their own owner_id, so users can only redact
their own notes. Browser-based join page at `boothub.dev/s/<sid>`.

Sign-in via email/GitHub/Google (with revocable per-user permissions on a long-lived scope) is on the roadmap.

## Env vars

- `BOOTHUB_BASE` — override API base URL (default `https://boothub.dev`)
- `BOOTHUB_TOKEN` — override the saved token
- `BOOTHUB_SCOPE` — default scope when `--scope` is not passed

## License

MIT.
