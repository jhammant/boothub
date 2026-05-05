import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { BoothubClient, tokenPath } from "./api.js";

export async function login(args: { scope?: string; ttl_seconds?: number } = {}): Promise<void> {
  const scope = args.scope ?? promptScope();
  const client = new BoothubClient();
  const result = await client.claimKey(scope, args.ttl_seconds);
  const path = tokenPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, result.key, { mode: 0o600 });
  const expires = new Date(result.expires_at * 1000).toISOString();
  console.log(`✓ saved claim-key for scope "${scope}" (expires ${expires}) → ${path}`);
  console.log("  agents using @boothub/swarm-mcp will now authenticate automatically");
}

function promptScope(): string {
  // Read once from stdin synchronously. For non-interactive use, require --scope.
  const scope = process.env.BOOTHUB_SCOPE;
  if (scope) return scope;
  process.stderr.write("scope name (e.g. 'my-project-2026'): ");
  let buf = "";
  const fd = 0;
  const chunk = Buffer.alloc(1);
  while (true) {
    try {
      const n = require("node:fs").readSync(fd, chunk, 0, 1, null);
      if (n <= 0) break;
      const c = chunk.toString("utf8");
      if (c === "\n" || c === "\r") break;
      buf += c;
    } catch {
      break;
    }
  }
  buf = buf.trim();
  if (!buf) throw new Error("scope is required (pass --scope or set BOOTHUB_SCOPE)");
  return buf;
}
