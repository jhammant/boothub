import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { ManifestError } from "../lib/manifest.ts";
import { renderProfile } from "../lib/render.ts";
import type { Target } from "../lib/schema.ts";

const VALID_TARGETS = new Set<Target>([
  "claude-code",
  "cursor",
  "codex",
  "aider",
  "windsurf",
  "cline",
]);

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;
const PRESET_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const REF_RE = /^[a-zA-Z0-9._\/-]{1,128}$/;

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  // Path is /USERNAME or /USERNAME/PRESET. Strip leading slash, split.
  const segments = event.rawPath.replace(/^\/+/, "").split("/").filter(Boolean);
  const username = segments[0];
  const preset = segments[1];

  if (!username) {
    return errorResponse(404, "missing username");
  }
  if (segments.length > 2) {
    return errorResponse(404, `not found: ${event.rawPath}`);
  }
  if (!USERNAME_RE.test(username)) {
    return errorResponse(400, `invalid github username: ${username}`);
  }
  if (preset !== undefined && !PRESET_RE.test(preset)) {
    return errorResponse(400, `invalid preset name: ${preset}`);
  }

  const qs = new URLSearchParams(event.rawQueryString ?? "");
  const ref = qs.get("ref") ?? undefined;
  if (ref && !REF_RE.test(ref)) {
    return errorResponse(400, `invalid ref: ${ref}`);
  }
  const targetParam = qs.get("target") ?? undefined;
  let target: Target | undefined;
  if (targetParam) {
    if (!VALID_TARGETS.has(targetParam as Target)) {
      return errorResponse(400, `invalid target: ${targetParam}`);
    }
    target = targetParam as Target;
  }
  const noCache = qs.has("nocache");

  try {
    const body = await renderProfile({ user: username, preset, ref, target });
    return {
      statusCode: 200,
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "cache-control": noCache ? "no-store" : "public, max-age=300, s-maxage=300",
        "x-boothub-profile": username,
        ...(preset ? { "x-boothub-preset": preset } : {}),
        ...(ref ? { "x-boothub-ref": ref } : {}),
      },
      body,
    };
  } catch (e) {
    if (e instanceof ManifestError) {
      return errorResponse(e.status, e.message, e.details);
    }
    return errorResponse(500, `internal error: ${(e as Error).message}`);
  }
};

function errorResponse(
  statusCode: number,
  message: string,
  details?: unknown,
): APIGatewayProxyResultV2 {
  const body = `# boothub error (${statusCode})\n\n${message}\n${
    details ? `\n\`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\`\n` : ""
  }`;
  return {
    statusCode,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "no-store",
    },
    body,
  };
}
