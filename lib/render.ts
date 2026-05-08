import { type RenderOptions, ManifestError, parseManifest, renderManifest } from "./manifest.ts";

export interface FetchProfileOptions extends RenderOptions {
  user: string;
  ref?: string;
  fetch?: typeof globalThis.fetch;
}

export const BUILTIN_PROFILES = new Set([
  "starter",
  "team-duo",
  "team-quad",
  "stack-typescript",
  "stack-python",
  "stack-rust",
]);

function builtinManifestUrl(name: string): string {
  const base = process.env.BOOTHUB_BASE ?? "https://boothub.dev";
  return `${base}/_assets/profiles/${name}/MANIFEST.md`;
}

export async function fetchProfileManifest(opts: FetchProfileOptions): Promise<string> {
  const fetcher = opts.fetch ?? globalThis.fetch;
  if (BUILTIN_PROFILES.has(opts.user)) {
    const url = builtinManifestUrl(opts.user);
    const res = await fetcher(url, { headers: { "User-Agent": "boothub-renderer/0.1" } });
    if (res.status === 404) {
      throw new ManifestError(`builtin profile "${opts.user}" not deployed (S3 404)`, 404);
    }
    if (!res.ok) {
      throw new ManifestError(`builtin manifest fetch failed: HTTP ${res.status}`, 502);
    }
    return await res.text();
  }
  const ref = opts.ref ?? "main";
  const url = `https://raw.githubusercontent.com/${opts.user}/boothub-profile/${ref}/MANIFEST.md`;
  const res = await fetcher(url, { headers: { "User-Agent": "boothub-renderer/0.1" } });
  if (res.status === 404) {
    throw new ManifestError(
      `no boothub-profile repo for "${opts.user}". expected: github.com/${opts.user}/boothub-profile`,
      404,
    );
  }
  if (!res.ok) {
    throw new ManifestError(`upstream github fetch failed: HTTP ${res.status}`, 502);
  }
  return await res.text();
}

export async function renderProfile(opts: FetchProfileOptions): Promise<string> {
  const text = await fetchProfileManifest(opts);
  const parsed = parseManifest(text);
  return renderManifest(parsed, { ...opts, resolveFromUrls: opts.resolveFromUrls ?? true });
}
