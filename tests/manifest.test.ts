import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyPreset,
  applyTarget,
  bundleAppliesTo,
  ManifestError,
  parseManifest,
  rawUrl,
  renderManifest,
  resolveFromUrls,
} from "../lib/manifest.ts";
import { renderProfile } from "../lib/render.ts";
import type { Bundle } from "../lib/schema.ts";

const FIXTURE = (name: string) =>
  readFileSync(join(__dirname, "..", "schema", "examples", name), "utf8");

describe("parseManifest", () => {
  it("parses a full profile", () => {
    const { manifest, body } = parseManifest(FIXTURE("jhammant-full.md"));
    expect(manifest.profile).toBe("jhammant");
    expect(manifest.bundles.length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(manifest.presets)).toEqual(expect.arrayContaining(["default", "swarm", "lite"]));
    expect(body).toContain("jhammant's boothub profile");
  });

  it("parses a lite profile with inline content", () => {
    const { manifest } = parseManifest(FIXTURE("jhammant-lite.md"));
    const ctx = manifest.bundles.find((b) => b.id === "project-context");
    expect(ctx?.kind).toBe("files");
    if (ctx?.kind === "files") {
      expect(ctx.files[0]?.content).toContain("Project context");
    }
  });

  it("rejects manifests with unknown bundle ids in presets", () => {
    const bad = `---\nboothub: 1\nprofile: bad\nsource: https://github.com/x/boothub-profile\ntargets: [claude-code]\nsummary: x\npresets:\n  default: [missing]\nbundles:\n  - { id: real, kind: files, files: [{ path: a, content: b }] }\n---\nbody`;
    expect(() => parseManifest(bad)).toThrow(ManifestError);
  });

  it("rejects duplicate bundle ids", () => {
    const bad = `---\nboothub: 1\nprofile: bad\nsource: https://github.com/x/boothub-profile\ntargets: [claude-code]\nsummary: x\npresets:\n  default: [a]\nbundles:\n  - { id: a, kind: files, files: [{ path: x, content: y }] }\n  - { id: a, kind: files, files: [{ path: x, content: y }] }\n---\nbody`;
    expect(() => parseManifest(bad)).toThrow(/duplicate bundle ids/);
  });

  it("rejects invalid bundle id casing", () => {
    const bad = `---\nboothub: 1\nprofile: bad\nsource: https://github.com/x/boothub-profile\ntargets: [claude-code]\nsummary: x\npresets:\n  default: [BadId]\nbundles:\n  - { id: BadId, kind: files, files: [{ path: x, content: y }] }\n---\nbody`;
    expect(() => parseManifest(bad)).toThrow(ManifestError);
  });
});

describe("applyPreset", () => {
  it("filters bundles to those in the preset", () => {
    const { manifest } = parseManifest(FIXTURE("jhammant-full.md"));
    const filtered = applyPreset(manifest, "lite");
    expect(filtered.bundles.map((b) => b.id).sort()).toEqual(["commands", "skills"]);
  });

  it("defaults to 'default' preset when none specified", () => {
    const { manifest } = parseManifest(FIXTURE("jhammant-full.md"));
    const filtered = applyPreset(manifest);
    expect(filtered.bundles.map((b) => b.id).sort()).toEqual([
      "commands",
      "project-context",
      "skills",
    ]);
  });

  it("throws 404 ManifestError on unknown preset", () => {
    const { manifest } = parseManifest(FIXTURE("jhammant-full.md"));
    expect(() => applyPreset(manifest, "missing")).toThrow(ManifestError);
    try {
      applyPreset(manifest, "missing");
    } catch (e) {
      expect((e as ManifestError).status).toBe(404);
    }
  });
});

describe("applyTarget", () => {
  it("filters out bundles whose only-on excludes the target", () => {
    const { manifest } = parseManifest(FIXTURE("edge-cases.md"));
    const claude = applyTarget(manifest, "claude-code");
    expect(claude.bundles.map((b) => b.id)).toContain("hooks-claude-only");
    const cursor = applyTarget(manifest, "cursor");
    expect(cursor.bundles.map((b) => b.id)).not.toContain("hooks-claude-only");
  });

  it("returns the manifest unchanged when no target specified", () => {
    const { manifest } = parseManifest(FIXTURE("edge-cases.md"));
    expect(applyTarget(manifest).bundles.length).toBe(manifest.bundles.length);
  });
});

describe("bundleAppliesTo", () => {
  it("returns true when only-on is missing", () => {
    const b = { id: "x", kind: "files" as const, files: [{ path: "a", content: "b" }] };
    expect(bundleAppliesTo(b, "claude-code")).toBe(true);
  });

  it("supports both string and array forms of only-on", () => {
    const single: Bundle = {
      id: "x",
      kind: "files",
      "only-on": "claude-code",
      files: [{ path: "a", content: "b" }],
    };
    const multi: Bundle = {
      id: "x",
      kind: "files",
      "only-on": ["claude-code", "cursor"],
      files: [{ path: "a", content: "b" }],
    };
    expect(bundleAppliesTo(single, "claude-code")).toBe(true);
    expect(bundleAppliesTo(single, "cursor")).toBe(false);
    expect(bundleAppliesTo(multi, "cursor")).toBe(true);
    expect(bundleAppliesTo(multi, "codex")).toBe(false);
  });
});

describe("rawUrl", () => {
  it("builds raw URLs from github source", () => {
    const url = rawUrl("https://github.com/jhammant/boothub-profile", "main", "skills/x.md");
    expect(url).toBe("https://raw.githubusercontent.com/jhammant/boothub-profile/main/skills/x.md");
  });

  it("strips trailing .git", () => {
    const url = rawUrl("https://github.com/jhammant/boothub-profile.git", "v0.1", "a.md");
    expect(url).toBe("https://raw.githubusercontent.com/jhammant/boothub-profile/v0.1/a.md");
  });

  it("rejects non-github sources", () => {
    expect(() => rawUrl("https://gitlab.com/x/y", "main", "z")).toThrow(ManifestError);
  });
});

describe("resolveFromUrls", () => {
  it("rewrites file `from:` to absolute github raw URLs", () => {
    const { manifest } = parseManifest(FIXTURE("jhammant-full.md"));
    const resolved = resolveFromUrls(manifest, "main");
    const skills = resolved.bundles.find((b) => b.id === "skills");
    if (skills?.kind !== "files") throw new Error("expected files bundle");
    expect(skills.files[0]?.from).toMatch(/^https:\/\/raw\.githubusercontent\.com\//);
  });

  it("leaves inline content entries alone", () => {
    const { manifest } = parseManifest(FIXTURE("jhammant-lite.md"));
    const resolved = resolveFromUrls(manifest, "main");
    const ctx = resolved.bundles.find((b) => b.id === "project-context");
    if (ctx?.kind !== "files") throw new Error("expected files bundle");
    expect(ctx.files[0]?.content).toContain("Project context");
    expect(ctx.files[0]?.from).toBeUndefined();
  });
});

describe("renderManifest", () => {
  it("emits valid markdown with frontmatter and body", () => {
    const parsed = parseManifest(FIXTURE("jhammant-full.md"));
    const rendered = renderManifest(parsed, { preset: "lite" });
    expect(rendered).toMatch(/^---\n/);
    expect(rendered).toContain("profile: jhammant");
    expect(rendered).toContain("jhammant's boothub profile");
    // Round-trip: should re-parse
    const reparsed = parseManifest(rendered);
    expect(reparsed.manifest.bundles.map((b) => b.id).sort()).toEqual(["commands", "skills"]);
  });
});

describe("renderProfile (live fetch mocked)", () => {
  it("fetches and renders with preset filter applied", async () => {
    const fixture = FIXTURE("jhammant-full.md");
    const fakeFetch = async () =>
      new Response(fixture, { status: 200, headers: { "content-type": "text/plain" } });
    const out = await renderProfile({
      user: "jhammant",
      preset: "swarm",
      fetch: fakeFetch as typeof globalThis.fetch,
    });
    const reparsed = parseManifest(out);
    expect(reparsed.manifest.bundles.length).toBe(6);
    expect(reparsed.manifest.bundles.find((b) => b.id === "claw-bridge")).toBeDefined();
  });

  it("returns 404 ManifestError when GitHub returns 404", async () => {
    const fakeFetch = async () => new Response("not found", { status: 404 });
    await expect(
      renderProfile({ user: "noone", fetch: fakeFetch as typeof globalThis.fetch }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
