import matter from "gray-matter";
import { stringify as yamlStringify } from "yaml";
import { type Bundle, type Manifest, type Target, zManifest } from "./schema.ts";

export interface ParsedManifest {
  manifest: Manifest;
  body: string;
}

export interface RenderOptions {
  preset?: string;
  target?: Target;
  ref?: string;
  resolveFromUrls?: boolean;
}

export class ManifestError extends Error {
  constructor(
    message: string,
    public readonly status: number = 422,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ManifestError";
  }
}

export function parseManifest(text: string): ParsedManifest {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(text);
  } catch (e) {
    throw new ManifestError(`failed to parse YAML frontmatter: ${(e as Error).message}`);
  }
  const result = zManifest.safeParse(parsed.data);
  if (!result.success) {
    const first = result.error.issues[0];
    const msg = first
      ? `${first.message}${first.path.length ? ` (at ${first.path.join(".")})` : ""}`
      : "manifest failed schema validation";
    throw new ManifestError(msg, 422, result.error.issues);
  }
  return { manifest: result.data, body: parsed.content };
}

export function applyPreset(manifest: Manifest, presetName?: string): Manifest {
  const name = presetName ?? "default";
  const preset = manifest.presets[name];
  if (!preset) {
    const available = Object.keys(manifest.presets).join(", ");
    throw new ManifestError(`unknown preset "${name}". available: ${available}`, 404);
  }
  const allowed = new Set(preset);
  const bundles = manifest.bundles.filter((b) => allowed.has(b.id));
  // Collapse presets to just the active one — the rendered manifest no longer
  // contains the bundles that other presets reference.
  return { ...manifest, bundles, presets: { [name]: bundles.map((b) => b.id) } };
}

export function applyTarget(manifest: Manifest, target?: Target): Manifest {
  if (!target) return manifest;
  return {
    ...manifest,
    bundles: manifest.bundles.filter((b) => bundleAppliesTo(b, target)),
  };
}

export function bundleAppliesTo(bundle: Bundle, target: Target): boolean {
  const onlyOn = bundle["only-on"];
  if (!onlyOn) return true;
  const list = Array.isArray(onlyOn) ? onlyOn : [onlyOn];
  return list.includes(target);
}

export function rawUrl(source: string, ref: string, path: string): string {
  // source is like https://github.com/jhammant/boothub-profile
  const m = source.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!m) throw new ManifestError(`source must be a github.com repo URL, got: ${source}`);
  const [, user, repo] = m;
  return `https://raw.githubusercontent.com/${user}/${repo}/${ref}/${path}`;
}

export function resolveFromUrls(manifest: Manifest, ref: string): Manifest {
  return {
    ...manifest,
    bundles: manifest.bundles.map((b) => {
      if (b.kind !== "files") return b;
      return {
        ...b,
        files: b.files.map((f) =>
          f.from ? { ...f, from: rawUrl(manifest.source, ref, f.from) } : f,
        ),
      };
    }),
  };
}

export function renderManifest(parsed: ParsedManifest, opts: RenderOptions = {}): string {
  let m = parsed.manifest;
  if (opts.preset) m = applyPreset(m, opts.preset);
  if (opts.target) m = applyTarget(m, opts.target);
  if (opts.resolveFromUrls) m = resolveFromUrls(m, opts.ref ?? "main");
  // Re-emit frontmatter + body. Reorder presets so the active one is first for clarity.
  const frontmatter = yamlStringify(m, { lineWidth: 100 });
  return `---\n${frontmatter}---\n${parsed.body}`;
}
