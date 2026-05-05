import { createHash, randomBytes } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.SWARM_TABLE ?? "boothub-swarm";

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

export interface ClaimKey {
  key: string;
  scope: string;
  expires_at: number;
}

export interface ScopeMeta {
  scope: string;
  owner_id: string;
  public_read: boolean;
  created_at: number;
}

export class SwarmError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "SwarmError";
  }
}

const SCOPE_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const AGENT_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ID_RE = /^[a-z0-9-]{1,64}$/;
const TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const KEY_RE = /^[A-Za-z0-9_-]{40,}$/;
const MAX_BODY = 32 * 1024;

export function validateScope(s: string): void {
  if (!SCOPE_RE.test(s)) throw new SwarmError(400, `invalid scope: ${s}`);
}

export function validateAgent(s: string): void {
  if (!AGENT_RE.test(s)) throw new SwarmError(400, `invalid agent: ${s}`);
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function randomId(bytes = 8): string {
  return randomBytes(bytes).toString("hex");
}

export async function getScope(scope: string): Promise<ScopeMeta | undefined> {
  validateScope(scope);
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { pk: `scope#${scope}`, sk: "meta" } }),
  );
  if (!res.Item) return undefined;
  return {
    scope: res.Item.scope,
    owner_id: res.Item.owner_id,
    public_read: res.Item.public_read,
    created_at: res.Item.created_at,
  };
}

export async function ensureScope(scope: string, owner_id: string, public_read = false): Promise<ScopeMeta> {
  validateScope(scope);
  const existing = await getScope(scope);
  if (existing) return existing;
  const meta: ScopeMeta = { scope, owner_id, public_read, created_at: Date.now() };
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: { pk: `scope#${scope}`, sk: "meta", ...meta },
      ConditionExpression: "attribute_not_exists(pk)",
    }),
  );
  return meta;
}

export async function writeNote(input: {
  scope: string;
  agent: string;
  body: string;
  tags?: string[];
  owner_id: string;
}): Promise<Note> {
  validateScope(input.scope);
  validateAgent(input.agent);
  if (input.body.length > MAX_BODY) {
    throw new SwarmError(413, `note body exceeds ${MAX_BODY} bytes; use S3-backed body (not yet implemented)`);
  }
  if (input.tags && input.tags.length > 16) {
    throw new SwarmError(400, "max 16 tags per note");
  }
  await ensureScope(input.scope, input.owner_id);
  const ts = new Date().toISOString();
  const id = randomId();
  const note: Note = {
    id,
    scope: input.scope,
    agent: input.agent,
    ts,
    body: input.body,
    tags: input.tags ?? [],
    owner_id: input.owner_id,
    created_at: Date.now(),
  };
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: { pk: `scope#${input.scope}`, sk: `note#${ts}#${id}`, ...note },
    }),
  );
  return note;
}

export async function listNotes(input: {
  scope: string;
  limit?: number;
  since?: string;
}): Promise<Note[]> {
  validateScope(input.scope);
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const skLow = input.since ? `note#${input.since}` : "note#";
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "pk = :pk AND sk BETWEEN :lo AND :hi",
      ExpressionAttributeValues: {
        ":pk": `scope#${input.scope}`,
        ":lo": skLow,
        ":hi": "note#~",
      },
      Limit: limit,
      ScanIndexForward: false, // newest first
    }),
  );
  return (res.Items ?? []).map((it) => ({
    id: it.id,
    scope: it.scope,
    agent: it.agent,
    ts: it.ts,
    body: it.body,
    tags: it.tags ?? [],
    owner_id: it.owner_id,
    created_at: it.created_at,
  }));
}

export async function deleteNote(input: {
  scope: string;
  ts: string;
  id: string;
  caller_id: string;
}): Promise<void> {
  validateScope(input.scope);
  if (!TS_RE.test(input.ts)) throw new SwarmError(400, "invalid ts");
  if (!ID_RE.test(input.id)) throw new SwarmError(400, "invalid id");
  const sk = `note#${input.ts}#${input.id}`;
  const existing = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { pk: `scope#${input.scope}`, sk } }),
  );
  if (!existing.Item) throw new SwarmError(404, "note not found");
  if (existing.Item.owner_id !== input.caller_id) {
    throw new SwarmError(403, "only the note's owner may delete it");
  }
  await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { pk: `scope#${input.scope}`, sk } }));
}

export async function issueClaimKey(input: {
  scope: string;
  ttl_seconds?: number;
}): Promise<ClaimKey> {
  validateScope(input.scope);
  const key = randomBytes(32).toString("base64url");
  const ttl = Math.min(Math.max(input.ttl_seconds ?? 60 * 60 * 24 * 30, 60), 60 * 60 * 24 * 365);
  const expires_at = Math.floor(Date.now() / 1000) + ttl;
  const hash = sha256Hex(key);
  // owner_id for claim-key flow is the hash itself (uniquely identifies the key holder)
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        pk: `key#${hash}`,
        sk: "meta",
        scope: input.scope,
        owner_id: `claimkey#${hash.slice(0, 16)}`,
        ttl: expires_at,
      },
    }),
  );
  return { key, scope: input.scope, expires_at };
}

/** Returns the (scope, owner_id) for a key, or undefined if invalid/expired. */
export async function resolveClaimKey(key: string): Promise<{ scope: string; owner_id: string } | undefined> {
  if (!KEY_RE.test(key)) return undefined;
  const hash = sha256Hex(key);
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { pk: `key#${hash}`, sk: "meta" } }),
  );
  if (!res.Item) return undefined;
  if (res.Item.ttl && res.Item.ttl < Math.floor(Date.now() / 1000)) return undefined;
  return { scope: res.Item.scope, owner_id: res.Item.owner_id };
}

export function synthesize(notes: Note[]): string {
  if (notes.length === 0) return "# Swarm synthesis\n\n_(no notes)_\n";
  const byAgent = new Map<string, Note[]>();
  for (const n of notes) {
    const arr = byAgent.get(n.agent) ?? [];
    arr.push(n);
    byAgent.set(n.agent, arr);
  }
  const sections: string[] = [`# Swarm synthesis (${notes.length} notes across ${byAgent.size} agents)`];
  for (const [agent, arr] of [...byAgent.entries()].sort()) {
    sections.push(`\n## ${agent} (${arr.length})`);
    for (const n of arr.slice(0, 10)) {
      const firstLine = (n.body.split("\n")[0] ?? "").slice(0, 200);
      sections.push(`- \`${n.ts}\` ${firstLine}`);
    }
    if (arr.length > 10) sections.push(`- … and ${arr.length - 10} more`);
  }
  return sections.join("\n") + "\n";
}
