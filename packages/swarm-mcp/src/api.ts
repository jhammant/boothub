import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_BASE = "https://boothub.dev";

export interface Note {
  id: string;
  scope: string;
  agent: string;
  ts: string;
  body: string;
  tags: string[];
  owner_id: string;
  created_at: number;
}

export interface ClaimKeyResponse {
  key: string;
  scope: string;
  expires_at: number;
}

export class BoothubApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "BoothubApiError";
  }
}

export class BoothubClient {
  private readonly base: string;
  private readonly token: string | undefined;

  constructor(opts: { base?: string; token?: string } = {}) {
    this.base = opts.base ?? process.env.BOOTHUB_BASE ?? DEFAULT_BASE;
    this.token = opts.token ?? process.env.BOOTHUB_TOKEN ?? readTokenFile();
  }

  hasToken(): boolean {
    return !!this.token;
  }

  async claimKey(scope: string, ttl_seconds?: number): Promise<ClaimKeyResponse> {
    return this.req("POST", "/api/auth/claim-key", { scope, ttl_seconds }, false);
  }

  async writeNote(input: {
    scope: string;
    agent: string;
    body: string;
    tags?: string[];
  }): Promise<Note> {
    const { scope, ...rest } = input;
    return this.req("POST", `/api/swarm/${encodeURIComponent(scope)}/notes`, rest);
  }

  async listNotes(input: {
    scope: string;
    limit?: number;
    since?: string;
  }): Promise<{ notes: Note[] }> {
    const qs = new URLSearchParams();
    if (input.limit) qs.set("limit", String(input.limit));
    if (input.since) qs.set("since", input.since);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return this.req(
      "GET",
      `/api/swarm/${encodeURIComponent(input.scope)}/notes${suffix}`,
    );
  }

  async synthesize(scope: string, limit?: number): Promise<string> {
    const qs = limit ? `?limit=${limit}` : "";
    const url = `${this.base}/api/swarm/${encodeURIComponent(scope)}/synthesize${qs}`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.authHeaders(),
    });
    if (!res.ok) {
      throw new BoothubApiError(res.status, await res.text().catch(() => res.statusText));
    }
    return await res.text();
  }

  private async req<T>(
    method: string,
    path: string,
    body?: unknown,
    requireAuth = true,
  ): Promise<T> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (requireAuth) {
      if (!this.token) {
        throw new BoothubApiError(
          401,
          "no boothub token; run `npx @boothub/swarm-mcp login` or set BOOTHUB_TOKEN",
        );
      }
      headers["authorization"] = `ClaimKey ${this.token}`;
    }
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new BoothubApiError(res.status, text || res.statusText);
    }
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  private authHeaders(): Record<string, string> {
    if (!this.token) {
      throw new BoothubApiError(401, "no boothub token");
    }
    return { authorization: `ClaimKey ${this.token}` };
  }
}

export function tokenPath(): string {
  return join(homedir(), ".config", "boothub", "token");
}

function readTokenFile(): string | undefined {
  try {
    return readFileSync(tokenPath(), "utf8").trim();
  } catch {
    return undefined;
  }
}
