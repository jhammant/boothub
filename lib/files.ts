import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SwarmError } from "./swarm-storage.ts";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const TABLE = process.env.SWARM_TABLE ?? "boothub-swarm";
const BLOB_BUCKET = process.env.BLOB_BUCKET ?? "boothub-dev-blobs";
const ADMIN_HASH = process.env.BOOTHUB_ADMIN_TOKEN_HASH;

const SCOPE_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const ID_RE = /^[a-z0-9-]{1,64}$/;
const NAME_RE = /^[A-Za-z0-9._-]{1,200}$/;
const PRESIGNED_TTL = 600; // 10 min

export interface FileRecord {
  id: string;
  scope: string;
  name: string;
  content_type: string;
  size?: number;
  s3_key: string;
  uploaded_at: number;
  uploaded_by: string;
}

export interface PresignedUpload {
  id: string;
  scope: string;
  name: string;
  presigned_put_url: string;
  expires_at: number;
}

export interface FileWithDownload extends FileRecord {
  presigned_get_url: string;
  expires_at: number;
}

function validateScope(s: string): void {
  if (!SCOPE_RE.test(s)) throw new SwarmError(400, `invalid scope: ${s}`);
}

function validateName(n: string): void {
  if (!NAME_RE.test(n)) {
    throw new SwarmError(400, `invalid filename: must match ${NAME_RE.source}`);
  }
}

function validateId(s: string): void {
  if (!ID_RE.test(s)) throw new SwarmError(400, `invalid id: ${s}`);
}

function safeS3Key(scope: string, ts: string, id: string, name: string): string {
  // S3 key: scope/ts-id-name. Name was validated, so no path traversal possible.
  return `${scope}/${ts}-${id}-${name}`;
}

/** Constant-time admin auth check. Returns false if no admin hash configured. */
export function isAdminAuthorized(headerValue: string | undefined): boolean {
  if (!ADMIN_HASH || !headerValue) return false;
  const hex = createHash("sha256").update(headerValue).digest("hex");
  if (hex.length !== ADMIN_HASH.length) return false;
  return timingSafeEqual(Buffer.from(hex, "hex"), Buffer.from(ADMIN_HASH, "hex"));
}

export async function createUpload(input: {
  scope: string;
  name: string;
  content_type?: string;
  uploader_id: string;
}): Promise<PresignedUpload> {
  validateScope(input.scope);
  validateName(input.name);
  const id = randomBytes(8).toString("hex");
  const ts = new Date().toISOString();
  const s3_key = safeS3Key(input.scope, ts, id, input.name);
  const content_type = input.content_type ?? "application/octet-stream";

  // Pre-create the index entry so list/get works immediately.
  // S3 PUT may not have happened yet — that's documented in the trust model.
  const record: FileRecord = {
    id,
    scope: input.scope,
    name: input.name,
    content_type,
    s3_key,
    uploaded_at: Date.now(),
    uploaded_by: input.uploader_id,
  };
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: { pk: `blob#${input.scope}`, sk: `${ts}#${id}`, ...record },
    }),
  );

  const put = new PutObjectCommand({
    Bucket: BLOB_BUCKET,
    Key: s3_key,
    ContentType: content_type,
  });
  const presigned_put_url = await getSignedUrl(s3, put, { expiresIn: PRESIGNED_TTL });
  const expires_at = Math.floor(Date.now() / 1000) + PRESIGNED_TTL;
  return { id, scope: input.scope, name: input.name, presigned_put_url, expires_at };
}

export async function listFiles(scope: string, limit = 50): Promise<FileRecord[]> {
  validateScope(scope);
  const lim = Math.min(Math.max(limit, 1), 200);
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": `blob#${scope}` },
      Limit: lim,
      ScanIndexForward: false, // newest first
    }),
  );
  return (res.Items ?? []).map((it) => ({
    id: it.id,
    scope: it.scope,
    name: it.name,
    content_type: it.content_type,
    size: it.size,
    s3_key: it.s3_key,
    uploaded_at: it.uploaded_at,
    uploaded_by: it.uploaded_by,
  }));
}

export async function getFile(scope: string, id: string): Promise<FileWithDownload> {
  validateScope(scope);
  validateId(id);
  // Need to scan or query by id since sk is "{ts}#{id}". Use a Query with begins_with on a known prefix?
  // Cheaper: keep the same record but query the GSI later. For v0, do a Query and filter.
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "pk = :pk",
      FilterExpression: "id = :id",
      ExpressionAttributeValues: { ":pk": `blob#${scope}`, ":id": id },
      Limit: 1,
    }),
  );
  const item = (res.Items ?? [])[0];
  if (!item) throw new SwarmError(404, "file not found");

  const get = new GetObjectCommand({ Bucket: BLOB_BUCKET, Key: item.s3_key });
  const presigned_get_url = await getSignedUrl(s3, get, { expiresIn: PRESIGNED_TTL });
  const expires_at = Math.floor(Date.now() / 1000) + PRESIGNED_TTL;

  return {
    id: item.id,
    scope: item.scope,
    name: item.name,
    content_type: item.content_type,
    size: item.size,
    s3_key: item.s3_key,
    uploaded_at: item.uploaded_at,
    uploaded_by: item.uploaded_by,
    presigned_get_url,
    expires_at,
  };
}

export async function deleteFile(scope: string, id: string): Promise<void> {
  validateScope(scope);
  validateId(id);
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "pk = :pk",
      FilterExpression: "id = :id",
      ExpressionAttributeValues: { ":pk": `blob#${scope}`, ":id": id },
      Limit: 1,
    }),
  );
  const item = (res.Items ?? [])[0];
  if (!item) throw new SwarmError(404, "file not found");

  await s3.send(new DeleteObjectCommand({ Bucket: BLOB_BUCKET, Key: item.s3_key }));
  await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { pk: item.pk, sk: item.sk } }));
}
