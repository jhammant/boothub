#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import { ManifestError, parseManifest } from "../lib/manifest.ts";

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error("usage: tsx tools/validate.ts <path-to-MANIFEST.md>");
  process.exit(2);
}

const path = args[0]!;
let text: string;
try {
  text = readFileSync(path, "utf8");
} catch (e) {
  console.error(`could not read ${path}: ${(e as Error).message}`);
  process.exit(2);
}

try {
  const { manifest, body } = parseManifest(text);
  console.log(`✅ valid: ${manifest.profile}`);
  console.log(`   bundles: ${manifest.bundles.length}`);
  console.log(`   presets: ${Object.keys(manifest.presets).join(", ")}`);
  console.log(`   targets: ${manifest.targets.join(", ")}`);
  console.log(`   body chars: ${body.length}`);
  process.exit(0);
} catch (e) {
  if (e instanceof ManifestError) {
    console.error(`❌ ${e.message}`);
    if (e.details) console.error(JSON.stringify(e.details, null, 2));
    process.exit(1);
  }
  throw e;
}
