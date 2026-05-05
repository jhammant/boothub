import { z } from "zod";

export const TARGETS = ["claude-code", "cursor", "codex", "aider", "windsurf", "cline"] as const;
export type Target = (typeof TARGETS)[number];

const zTarget = z.enum(TARGETS);
const zOnlyOn = z.union([zTarget, z.array(zTarget)]).optional();
const zTemplateVars = z.array(z.string()).optional();

const zFileEntry = z
  .object({
    path: z.string().min(1),
    from: z.string().min(1).optional(),
    content: z.string().optional(),
  })
  .refine((f) => f.from || f.content, { message: "file entry must have either `from` or `content`" });

const zMcpPerTarget = z.record(
  z.string(),
  z.object({
    scope: z.enum(["user", "project", "local"]).optional(),
    file: z.string().optional(),
    config: z.record(z.string(), z.unknown()),
  }),
);

const zHook = z.object({
  event: z.string().min(1),
  matcher: z.string().optional(),
  command: z.string().min(1),
});

const zBundleBase = {
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "bundle id must be lowercase kebab-case"),
  "only-on": zOnlyOn,
  post: z.string().optional(),
};

const zFilesBundle = z.object({
  ...zBundleBase,
  kind: z.literal("files"),
  files: z.array(zFileEntry).min(1),
});

const zMcpBundle = z.object({
  ...zBundleBase,
  kind: z.literal("mcp"),
  mcp: zMcpPerTarget,
  template_vars: zTemplateVars,
  env_required: z.array(z.string()).optional(),
  secrets: z.record(z.string(), z.string()).optional(),
});

const zHooksBundle = z.object({
  ...zBundleBase,
  kind: z.literal("hooks"),
  hooks: z.array(zHook).min(1),
  template_vars: zTemplateVars,
});

export const zBundle = z.discriminatedUnion("kind", [zFilesBundle, zMcpBundle, zHooksBundle]);

export const zManifest = z
  .object({
    boothub: z.literal(1),
    profile: z.string().min(1),
    generated: z.string().datetime().optional(),
    source: z.string().url(),
    targets: z.array(zTarget).min(1),
    summary: z.string().min(1),
    presets: z.record(z.string(), z.array(z.string()).min(1)),
    bundles: z.array(zBundle).min(1),
    post_install: z.array(z.string()).optional(),
  })
  .superRefine((m, ctx) => {
    const ids = new Set(m.bundles.map((b) => b.id));
    if (ids.size !== m.bundles.length) {
      ctx.addIssue({ code: "custom", message: "duplicate bundle ids" });
    }
    for (const [name, bundleIds] of Object.entries(m.presets)) {
      for (const id of bundleIds) {
        if (!ids.has(id)) {
          ctx.addIssue({ code: "custom", message: `preset "${name}" references unknown bundle "${id}"` });
        }
      }
    }
  });

export type Manifest = z.infer<typeof zManifest>;
export type Bundle = z.infer<typeof zBundle>;
export type FilesBundle = z.infer<typeof zFilesBundle>;
export type McpBundle = z.infer<typeof zMcpBundle>;
export type HooksBundle = z.infer<typeof zHooksBundle>;
