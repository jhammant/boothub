#!/usr/bin/env tsx
import { ManifestError } from "../lib/manifest.ts";
import { renderProfile } from "../lib/render.ts";

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("usage: tsx tools/render.ts <user> [<preset>] [--ref=<ref>] [--target=<target>]");
  process.exit(2);
}

const user = args[0]!;
let preset: string | undefined;
let ref: string | undefined;
let target: string | undefined;

for (const arg of args.slice(1)) {
  if (arg.startsWith("--ref=")) ref = arg.slice(6);
  else if (arg.startsWith("--target=")) target = arg.slice(9);
  else if (!preset) preset = arg;
}

try {
  const out = await renderProfile({ user, preset, ref, target: target as never });
  process.stdout.write(out);
} catch (e) {
  if (e instanceof ManifestError) {
    console.error(`❌ [${e.status}] ${e.message}`);
    if (e.details) console.error(JSON.stringify(e.details, null, 2));
    process.exit(1);
  }
  throw e;
}
