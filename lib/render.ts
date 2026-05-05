import { type RenderOptions, ManifestError, parseManifest, renderManifest } from "./manifest.ts";

export interface FetchProfileOptions extends RenderOptions {
  user: string;
  ref?: string;
  fetch?: typeof globalThis.fetch;
}

export async function fetchProfileManifest(opts: FetchProfileOptions): Promise<string> {
  const ref = opts.ref ?? "main";
  const url = `https://raw.githubusercontent.com/${opts.user}/boothub-profile/${ref}/MANIFEST.md`;
  const fetcher = opts.fetch ?? globalThis.fetch;
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
