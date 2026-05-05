import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  SwarmError,
  deleteNote,
  issueClaimKey,
  listNotes,
  resolveClaimKey,
  synthesize,
  writeNote,
} from "../lib/swarm-storage.ts";

interface Caller {
  owner_id: string;
  scope: string | "*";
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const path = event.rawPath;
    const method = event.requestContext.http.method;

    // ─── Public auth endpoint ───────────────────────────────────────────
    if (method === "POST" && path === "/api/auth/claim-key") {
      const body = parseJson(event);
      if (!body.scope || typeof body.scope !== "string") {
        return errorResponse(400, "missing scope");
      }
      const ttl = typeof body.ttl_seconds === "number" ? body.ttl_seconds : undefined;
      const result = await issueClaimKey({ scope: body.scope, ttl_seconds: ttl });
      return jsonResponse(201, result);
    }

    // ─── All swarm endpoints require auth ───────────────────────────────
    const caller = await authorize(event);
    if (!caller) return errorResponse(401, "missing or invalid Authorization header");

    // POST /api/swarm/{scope}/notes
    let m = path.match(/^\/api\/swarm\/([^/]+)\/notes\/?$/);
    if (m && method === "POST") {
      const scope = m[1]!;
      assertScope(caller, scope);
      const body = parseJson(event);
      if (!body.agent || !body.body) return errorResponse(400, "agent and body required");
      const note = await writeNote({
        scope,
        agent: String(body.agent),
        body: String(body.body),
        tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
        owner_id: caller.owner_id,
      });
      return jsonResponse(201, note);
    }
    if (m && method === "GET") {
      const scope = m[1]!;
      assertScope(caller, scope);
      const qs = new URLSearchParams(event.rawQueryString ?? "");
      const limit = qs.get("limit") ? Number(qs.get("limit")) : undefined;
      const since = qs.get("since") ?? undefined;
      const notes = await listNotes({ scope, limit, since });
      return jsonResponse(200, { notes });
    }

    // DELETE /api/swarm/{scope}/notes/{ts}/{id}
    m = path.match(/^\/api\/swarm\/([^/]+)\/notes\/([^/]+)\/([^/]+)\/?$/);
    if (m && method === "DELETE") {
      const [, scope, ts, id] = m;
      assertScope(caller, scope!);
      await deleteNote({ scope: scope!, ts: ts!, id: id!, caller_id: caller.owner_id });
      return { statusCode: 204, body: "" };
    }

    // POST /api/swarm/{scope}/synthesize
    m = path.match(/^\/api\/swarm\/([^/]+)\/synthesize\/?$/);
    if (m && method === "POST") {
      const scope = m[1]!;
      assertScope(caller, scope);
      const qs = new URLSearchParams(event.rawQueryString ?? "");
      const limit = qs.get("limit") ? Number(qs.get("limit")) : 100;
      const notes = await listNotes({ scope, limit });
      const summary = synthesize(notes);
      return {
        statusCode: 200,
        headers: { "content-type": "text/markdown; charset=utf-8" },
        body: summary,
      };
    }

    return errorResponse(404, `not found: ${method} ${path}`);
  } catch (e) {
    if (e instanceof SwarmError) return errorResponse(e.status, e.message);
    return errorResponse(500, `internal: ${(e as Error).message}`);
  }
};

async function authorize(event: APIGatewayProxyEventV2): Promise<Caller | undefined> {
  const auth = event.headers["authorization"] ?? event.headers["Authorization"];
  if (!auth) return undefined;
  if (auth.startsWith("ClaimKey ")) {
    const key = auth.slice(9).trim();
    const resolved = await resolveClaimKey(key);
    if (!resolved) return undefined;
    return { owner_id: resolved.owner_id, scope: resolved.scope };
  }
  // Future: Bearer <jwt> via Cognito
  return undefined;
}

function assertScope(caller: Caller, scope: string): void {
  if (caller.scope !== "*" && caller.scope !== scope) {
    throw new SwarmError(403, `caller authorized for scope "${caller.scope}", not "${scope}"`);
  }
}

function parseJson(event: APIGatewayProxyEventV2): Record<string, unknown> {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    throw new SwarmError(400, "invalid JSON body");
  }
}

function jsonResponse(statusCode: number, obj: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(obj),
  };
}

function errorResponse(statusCode: number, message: string): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ error: message }),
  };
}
