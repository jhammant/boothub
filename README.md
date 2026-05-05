# boothub

> Bootstrap any AI agent (Claude Code, Cursor, Codex, Aider…) from one URL. Profiles in GitHub. Swarms on us.

Live at **[boothub.dev](https://boothub.dev)** · Reference profile at [`jhammant/boothub-profile`](https://github.com/jhammant/boothub-profile).

```text
"Hey Claude, fetch boothub.dev/jhammant/swarm and bootstrap me."
```

The agent fetches a YAML+markdown manifest, shows a diff, asks per-bundle approval, then writes skills / slash commands / hooks / MCP configs / `CLAUDE.md` / `AGENTS.md` into your project — and stands up a coordinated multi-agent swarm.

## What's live (v0)

- ✅ **Manifest router**: `boothub.dev/USERNAME[/PRESET]?ref=...&target=...`
  - Reads `github.com/USERNAME/boothub-profile/MANIFEST.md`
  - Filters by preset, returns `text/markdown`
  - 5-minute edge cache, `?nocache=1` bypass
- ✅ **Hosted swarm coordination** (the product wedge):
  - `POST /api/auth/claim-key` — issue a scoped token
  - `POST /api/swarm/{scope}/notes` — write
  - `GET  /api/swarm/{scope}/notes` — list (newest first)
  - `DELETE /api/swarm/{scope}/notes/{ts}/{id}` — owner-only redact
  - `POST /api/swarm/{scope}/synthesize` — server-side aggregation
- ✅ **`@boothub/swarm-mcp`** npm package — MCP server exposing tools `swarm_write`, `swarm_read`, `swarm_synthesize`, `swarm_status` to any MCP-capable agent
- ✅ **Reference profile** (`jhammant/boothub-profile`) with 4 presets: `default` / `lite` / `swarm` / `swarm-pro` and 8 bundles
- ✅ **Web app** at `/app/claim.html`, `/app/scope.html` — issue claim-keys, view scope notes
- ✅ **`/boothub save`** slash command — capture local agent customisations into the published profile

## Architecture

```text
boothub.dev (CloudFront)
├─ S3 bucket            → /, /about.html, /app/*
├─ ManifestFn (Lambda)  → /USERNAME, /USERNAME/PRESET (no auth, GitHub-backed)
└─ SwarmFn (Lambda)     → /api/swarm/*, /api/auth/* (DynamoDB-backed)
                          auth: ClaimKey header (Cognito federation deferred)
```

All AWS, all CDK. CloudFront in `us-east-1`, certificate in ACM, DNS in Route53.

## Try it

- Read your profile: `curl https://boothub.dev/jhammant/swarm`
- Issue a claim-key: visit [boothub.dev/app/claim.html](https://boothub.dev/app/claim.html)
- Write a swarm note from your agent (after `npx @boothub/swarm-mcp login`)

## Make your own profile

1. Fork [`jhammant/boothub-profile`](https://github.com/jhammant/boothub-profile)
2. Edit `MANIFEST.md` (validate locally with `npx tsx tools/validate.ts MANIFEST.md`)
3. Push. `boothub.dev/YOURNAME` serves it immediately (5min cache).

## Local development

```bash
git clone git@github.com:jhammant/boothub.git
cd boothub
npm install
npm test                                # 20/20 vitest cases
npm run dev:lambda                      # local manifest endpoint on :8788
curl http://localhost:8788/jhammant     # against the live GitHub repo
```

## Deploy your own copy

```bash
cd infra
npx cdk bootstrap aws://ACCOUNT/us-east-1
npx cdk deploy --require-approval never
```

See `docs/aws-deployment.md` for the full topology + cost notes (<$1/month idle).

## Repos

- [`jhammant/boothub`](https://github.com/jhammant/boothub) — codebase (this repo)
- [`jhammant/boothub-profile`](https://github.com/jhammant/boothub-profile) — reference profile

## What's deferred from v0

- Cognito multi-provider sign-in (email magic link + GitHub + Google) — currently anonymous claim-by-key only
- Profile search / discovery
- Skill marketplace
- Scope sharing across users (only owner can write today)
- npm publish for `@boothub/swarm-mcp` (`npm publish` from `packages/swarm-mcp` when ready)

## Documentation

- [`docs/manifest-spec.md`](./docs/manifest-spec.md) — schema reference
- [`docs/trust-model.md`](./docs/trust-model.md) — what site / agent / manifest can do
- [`docs/swarm-patterns.md`](./docs/swarm-patterns.md) — Pattern A / B / C / D
- [`docs/swarm-github-memory.md`](./docs/swarm-github-memory.md) — Watson pattern howto
- [`docs/secrets-with-age.md`](./docs/secrets-with-age.md) — keypair gen + encryption
- [`docs/aws-deployment.md`](./docs/aws-deployment.md) — stack topology
- [`ideas.md`](./ideas.md) — design notes from initial exploration

## License

MIT.
