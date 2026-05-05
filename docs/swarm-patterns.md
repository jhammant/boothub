# Swarm patterns

A "swarm" in boothub-speak is a group of agents working on the same project, coordinating via shared memory. boothub doesn't invent the patterns — it makes them installable.

## Pattern A — GitHub-as-shared-memory (Watson)

Credit: [Alexander Watson](https://www.linkedin.com/in/alexandercrwatson/), surfaced in his "GitHub as shared memory for parallel agents" post.

Mechanism:
- Each agent has its own sandbox/session.
- Each writes a markdown note to a shared GitHub directory (`.swarm/notes/<agent>/<timestamp>.md`).
- A synthesis agent reads the directory and produces a final answer.
- Every write is a commit → audit trail, free crash recovery, no new infra.

boothub bundle: `github-memory` (in `swarm/github-memory/` of the profile repo).

Pros: zero infra, every dev has GitHub, fully auditable, survives sandbox crashes.
Cons: latency (commit + push), commit noise in your repo, no native cross-repo swarm.

[Full howto →](./swarm-github-memory.md)

## Pattern B — Hosted swarm (boothub.dev)

Mechanism:
- Each agent calls `boothub.dev/api/swarm/<scope>/notes` via the `@boothub/swarm-mcp` tool.
- Notes are stored in DynamoDB. Bodies <16KB are inline; larger bodies live in S3.
- Scope ownership is claim-on-write (first writer owns it).
- Auth via Cognito JWT (multi-provider) or anonymous claim-by-key.

boothub bundle: `hosted-swarm`.

Pros: <100ms latency, cross-repo by default, no commit noise, server-side synthesis.
Cons: depends on a service (boothub.dev), needs an account or claim-key.

## Pattern C — claw-bridge broker

Mechanism: distributed task broker the user runs themselves at `~/dev/claw-bridge/`. Tailscale-private HTTP API, SQLite queue, MCP tools (`bridge_send`, `bridge_read`, `bridge_status`, `bridge_tasks`, `bridge_context`).

boothub bundle: `claw-bridge`.

Best for: low-latency request/reply between agents on the same Tailnet.

## Pattern D — claude-history MCP

Mechanism: cross-session knowledge MCP with cloud sync. Agents publish learnings; later agents discover via search.

boothub bundle: `claude-history`.

Best for: institutional memory across long-running projects, not tight coordination.

## Mixing

A profile can install several patterns at once. Different agents in the same swarm can use different patterns for different tasks. The reference profile (`/jhammant/swarm-pro`) installs all four.
