#!/usr/bin/env node
import { runMcpServer } from "./index.js";
import { login } from "./login.js";

const [, , subcommand, ...rest] = process.argv;

function parseArgs(args: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (const a of args) {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=", 2);
      out[k!] = v ?? true;
    }
  }
  return out;
}

async function main() {
  if (!subcommand || subcommand === "serve") {
    await runMcpServer();
    return;
  }
  if (subcommand === "login" || subcommand === "claim") {
    const args = parseArgs(rest);
    await login({
      scope: typeof args.scope === "string" ? args.scope : undefined,
      ttl_seconds:
        typeof args["ttl-seconds"] === "string" ? Number(args["ttl-seconds"]) : undefined,
    });
    return;
  }
  if (subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    console.log(`@boothub/swarm-mcp

Usage:
  boothub-swarm-mcp                       run the MCP server (stdio transport)
  boothub-swarm-mcp serve                 same as above
  boothub-swarm-mcp login --scope NAME    obtain a claim-key, save to ~/.config/boothub/token
  boothub-swarm-mcp claim --scope NAME    alias of login (CI-friendly)

Env:
  BOOTHUB_BASE     override the API base URL (default https://boothub.dev)
  BOOTHUB_TOKEN    override the saved token (skips reading ~/.config/boothub/token)
  BOOTHUB_SCOPE    default scope to use when --scope is not passed`);
    return;
  }
  console.error(`unknown subcommand: ${subcommand}. try --help`);
  process.exit(2);
}

main().catch((e) => {
  console.error(`fatal: ${(e as Error).message}`);
  process.exit(1);
});
