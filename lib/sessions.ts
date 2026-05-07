import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SwarmError, issueClaimKey, writeNote } from "./swarm-storage.ts";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.SWARM_TABLE ?? "boothub-swarm";
const SID_RE = /^[A-Za-z0-9_-]{8,12}$/;
const PASSWORD_RE = /^[a-z]+(?:-[a-z]+){3}$/;

export interface SessionCreate {
  scope?: string;
  profile_url?: string;
  repo_url?: string;
  brief?: string;
  ttl_hours?: number;
}

export interface SessionMeta {
  sid: string;
  scope: string;
  profile_url?: string;
  repo_url?: string;
  expires_at: number;
  created_at: number;
}

export interface SessionCreated extends SessionMeta {
  password: string;
  share_url: string;
  claim_key: string;
}

export interface SessionJoined {
  scope: string;
  profile_url?: string;
  repo_url?: string;
  claim_key: string;
  expires_at: number;
}

const WORDS = [
  "able","acid","ago","also","area","army","atom","baby","back","bake","ball","band","bank","barn","base","bath","beam","bean","bear","beat","beef","bell","belt","best","bike","bird","blue","boat","body","bold","bone","book","boot","born","both","bowl","brave","bread","brick","brisk","brown","cake","calm","camp","card","care","cargo","carve","case","cash","cave","cedar","cell","chat","chef","chip","city","clay","clean","clear","cliff","cloud","clue","coal","coat","code","coin","cold","color","cook","cool","copper","copy","coral","core","crab","crane","crew","crop","crown","cube","cup","data","dawn","deer","desk","dock","draft","draw","dream","drum","duck","dust","each","early","earth","east","easy","echo","edge","eight","ember","enter","extra","fact","fair","faith","fall","farm","fast","feast","felt","fern","field","fifth","film","final","find","fire","first","fish","five","flag","flame","flax","flint","floor","flour","flow","fold","forest","forge","fork","form","four","fox","frame","free","fresh","frog","frost","fruit","full","game","gate","gem","ghost","gift","give","glad","glass","glide","gloom","glove","gold","good","grain","grand","grape","grass","gray","green","grid","groove","grove","guard","habit","hand","happy","harbor","hard","hare","harvest","hat","hawk","hazel","head","hearth","heath","heavy","hello","help","herb","hill","hint","honey","hope","horn","horse","host","huge","ice","ink","iris","iron","island","ivory","ivy","jade","jar","jolly","joy","just","kelp","kettle","key","kind","king","knife","knit","knot","lab","lace","lake","lamb","lamp","land","large","laser","lava","lawn","leaf","leap","lemon","level","light","lily","lime","line","link","lion","list","live","loaf","local","lock","loft","log","long","loom","loop","lord","lotus","loud","love","loyal","lunar","mango","map","maple","march","mark","marsh","mask","math","meadow","melon","melt","mesh","mild","mile","milk","mill","mind","mine","mint","mirror","mist","moat","mode","moon","moss","moth","mount","mud","music","myth","name","navy","near","nest","next","nice","night","noble","node","noon","north","note","oak","oat","ocean","odd","oil","olive","onion","onyx","open","opera","orange","orbit","orca","other","otter","oven","owl","page","paint","pair","palm","panda","park","past","patch","path","peach","peak","pear","pearl","pen","pencil","penny","pepper","photo","piano","pier","pine","pink","pipe","plant","plate","play","plum","plus","poem","point","polar","pole","pond","pony","port","post","pouch","pound","power","print","prism","proud","pulse","pump","quad","queen","quest","quiet","quick","quill","quilt","quiz","raft","rain","raisin","ranch","range","rapid","raven","ray","reach","read","real","red","reed","reef","relay","rest","rice","rich","ride","ridge","ring","rise","river","road","robin","rock","rope","rose","route","royal","ruby","rust","sage","sail","saint","salt","sand","sash","seal","sea","seat","seed","seek","sense","sepia","seven","shade","share","shed","shelf","shell","shield","shine","ship","shoe","shore","shrimp","silk","silo","silver","sing","skate","sketch","ski","skill","sky","slate","sled","slope","small","smart","smile","smoke","snap","snow","soap","soft","solar","solo","song","sound","south","space","spark","sphere","spice","spike","spine","spire","split","spool","spoon","sport","spring","spruce","spy","square","stable","staff","stag","stair","stamp","star","steam","steel","stem","step","stick","still","stir","stock","stone","store","stork","storm","stove","strap","straw","stream","strict","strike","sugar","sun","swan","swarm","swift","sword","table","tank","tape","task","tea","team","tent","thorn","three","thumb","tide","tidy","tile","timer","tin","tonic","tooth","topaz","torch","tower","town","trace","track","trade","trail","train","trap","tray","tree","trek","tribe","trick","trip","troop","trout","truck","true","trunk","trust","tulip","tuna","tundra","turbo","turn","twin","unit","urban","valve","vapor","vault","velvet","verb","verse","vest","video","view","vine","violet","virtue","visa","vista","vital","vivid","vocal","voice","volume","vortex","voyage","wagon","walnut","warm","wash","watch","water","wave","wax","weave","web","wedge","weed","west","wheat","wheel","whisk","white","wild","willow","wind","window","wine","wing","wink","winter","wire","wise","wolf","wonder","wood","wool","word","work","world","worm","yacht","yard","yarn","year","yeast","yellow","yield","yoga","yolk","young","zebra","zero","zest","zinc","zone","zoom"
];

export function generateSid(): string {
  return randomBytes(6).toString("base64url");
}

export function generatePassword(): string {
  const out: string[] = [];
  for (let i = 0; i < 4; i++) {
    out.push(WORDS[randomInt(WORDS.length)]!);
  }
  return out.join("-");
}

function pepper(): string {
  return process.env.SESSION_PEPPER ?? "boothub.dev/v1";
}

function passwordHash(password: string, sid: string): string {
  return createHash("sha256").update(`${pepper()}:${sid}:${password}`).digest("hex");
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

function validateSid(sid: string): void {
  if (!SID_RE.test(sid)) throw new SwarmError(400, "invalid session id");
}

export async function createSession(opts: SessionCreate): Promise<SessionCreated> {
  const sid = generateSid();
  const password = generatePassword();
  const scope = opts.scope?.trim() || `session-${sid.toLowerCase()}`;
  // Validate scope via the existing rule
  if (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(scope)) {
    throw new SwarmError(400, `invalid scope: ${scope}`);
  }
  const ttlHours = Math.min(Math.max(opts.ttl_hours ?? 24, 1), 24 * 30);
  const expires_at = Math.floor(Date.now() / 1000) + ttlHours * 3600;

  const created_at = Date.now();
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        pk: `session#${sid}`,
        sk: "meta",
        scope,
        profile_url: opts.profile_url,
        repo_url: opts.repo_url,
        password_hash: passwordHash(password, sid),
        created_at,
        ttl: expires_at,
      },
      ConditionExpression: "attribute_not_exists(pk)",
    }),
  );

  // Issue a creator claim-key for the same scope so the creator can immediately use it.
  const ck = await issueClaimKey({ scope, ttl_seconds: ttlHours * 3600 });

  return {
    sid,
    scope,
    profile_url: opts.profile_url,
    repo_url: opts.repo_url,
    password,
    share_url: `https://boothub.dev/s/${sid}`,
    expires_at,
    created_at,
    claim_key: ck.key,
  };
}

export async function getSessionMeta(sid: string): Promise<SessionMeta | undefined> {
  validateSid(sid);
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { pk: `session#${sid}`, sk: "meta" } }),
  );
  if (!res.Item) return undefined;
  if (res.Item.ttl && res.Item.ttl < Math.floor(Date.now() / 1000)) return undefined;
  return {
    sid,
    scope: res.Item.scope,
    profile_url: res.Item.profile_url,
    repo_url: res.Item.repo_url,
    expires_at: res.Item.ttl,
    created_at: res.Item.created_at,
  };
}

export async function joinSession(sid: string, password: string): Promise<SessionJoined> {
  validateSid(sid);
  if (!PASSWORD_RE.test(password)) {
    throw new SwarmError(401, "incorrect password");
  }
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { pk: `session#${sid}`, sk: "meta" } }),
  );
  if (!res.Item) throw new SwarmError(404, "session not found");
  if (res.Item.ttl && res.Item.ttl < Math.floor(Date.now() / 1000)) {
    throw new SwarmError(410, "session expired");
  }
  const expected = passwordHash(password, sid);
  if (!constantTimeEqualHex(expected, res.Item.password_hash as string)) {
    throw new SwarmError(401, "incorrect password");
  }
  const remaining = Math.max(res.Item.ttl - Math.floor(Date.now() / 1000), 60);
  const ck = await issueClaimKey({ scope: res.Item.scope, ttl_seconds: remaining });
  // Auto-post a join note so existing scope members see new arrivals (Phase 16a).
  // Failures here MUST NOT block the join — log and continue.
  try {
    const ownerHash = ck.key ? "claimkey-new" : "unknown";
    await writeNote({
      scope: res.Item.scope,
      agent: "joiner",
      body: `An agent joined this session via /s/${sid}. They should reply with @<their-name> once they pick one.`,
      tags: ["join", "status"],
      owner_id: ownerHash,
    });
  } catch (e) {
    console.error("join announcement failed (non-fatal):", (e as Error).message);
  }
  return {
    scope: res.Item.scope,
    profile_url: res.Item.profile_url,
    repo_url: res.Item.repo_url,
    claim_key: ck.key,
    expires_at: res.Item.ttl,
  };
}
