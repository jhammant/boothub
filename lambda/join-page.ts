import type { SessionMeta } from "../lib/sessions.ts";

export function renderAgentJoinMarkdown(opts: { sid: string; meta?: SessionMeta }): string {
  const { sid, meta } = opts;
  if (!meta) {
    return `# boothub session ${sid} — not found

The session at \`/s/${sid}\` either expired or never existed. Ask the
person who shared the link to create a new session at
\`https://boothub.dev/app/share.html\`.
`;
  }
  const expires = new Date(meta.expires_at * 1000).toISOString();
  const repo = meta.repo_url ?? "";
  const profile = meta.profile_url ?? "";
  const repoBasename = repo ? repo.split("/").pop()?.replace(/\.git$/, "") ?? "project" : "";
  const cloneStep = repo
    ? `## Step 2: Clone the repo onto your own agent branch

The session's swarm convention: every agent works on a branch named
\`agents/<your-name>/main\` so multiple agents can collaborate without
edit-conflicting on \`main\`. Pick a short name (e.g. \`bob\`, \`alice\`,
\`scholar\`) — it should be unique within the swarm.

If you don't have the repo cloned yet:

\`\`\`bash
cd ~/dev    # or wherever you keep projects
git clone ${repo} ${repoBasename}-<your-name>
cd ${repoBasename}-<your-name>
git checkout -b agents/<your-name>/main
\`\`\`

If you ALREADY have it cloned (e.g. you're another agent on the same
machine), use a worktree instead so we share the object DB:

\`\`\`bash
cd ~/dev/${repoBasename}                # existing clone
git fetch origin
git worktree add ~/dev/${repoBasename}-<your-name> -b agents/<your-name>/main origin/main
cd ~/dev/${repoBasename}-<your-name>
\`\`\`

Either way, you end up in your own working directory on your own branch.
`
    : `## Step 2: (no repo associated with this session — skip)
`;
  const profileStep = profile
    ? `## Step 3: Bootstrap the agent setup

Use WebFetch to get \`${profile}\` and walk through its manifest. Show me
each bundle as a diff and ask before writing any files. The bundles
install skills, slash commands, MCP configs, and AGENTS.md/CLAUDE.md.
`
    : `## Step 3: (no profile to bootstrap — skip)
`;

  return `# boothub session ${sid} — agent join instructions

You (an AI agent like Claude Code, Cursor, etc.) have been pointed at
this URL by someone wanting to share a session.

## How to find the password

Look at the URL the user gave you in their prompt. It probably looks
like one of these:

- \`https://boothub.dev/s/${sid}#four-hyphenated-words\` — the password is the URL fragment after the \`#\`
- \`https://boothub.dev/s/${sid}\` — separate password (4 hyphenated words) somewhere in the user's message

Extract the password before continuing. If you can't find one, ask the user.

## Session metadata
- Scope: \`${meta.scope}\`
- Repo: \`${repo || "(none)"}\`
- Profile: \`${profile || "(none)"}\`
- Expires: \`${expires}\`

## Step 1: Join the session with the password

\`\`\`bash
curl -sX POST https://boothub.dev/api/sessions/${sid}/join \\
  -H 'content-type: application/json' \\
  -d '{"password":"<the password the user gave you>"}'
\`\`\`

The response includes \`claim_key\`, \`scope\`, \`profile_url\`, \`repo_url\`.

Save the token so future swarm reads/writes work without re-auth:

\`\`\`bash
mkdir -p ~/.config/boothub
echo "<claim_key>" > ~/.config/boothub/token
chmod 600 ~/.config/boothub/token
\`\`\`

${cloneStep}
${profileStep}
## Step 4: Read the latest swarm notes — catch up cold

\`\`\`bash
curl -s "https://boothub.dev/api/swarm/${meta.scope}/notes?limit=15" \\
  -H "authorization: ClaimKey $(cat ~/.config/boothub/token)" | jq
\`\`\`

Find the most recent note tagged \`brief\` or \`init\` — that's the cold-start
explanation of where work is. Summarise for the user:

- What is the project working on?
- Where did the previous session leave off?
- What's the latest status (look for \`status\` tagged notes)?
- What should they tackle first?

## Step 5: Ask the user what to work on, then start

After every meaningful action you take, do TWO things:

**(a) Commit and push** to your agent branch (others fetch when they want):

\`\`\`bash
git add -A
git commit -m "<headline>"
git push -u origin agents/<your-name>/main
\`\`\`

**(b) Post a swarm note** announcing what changed (so others know there's
something to look at):

\`\`\`bash
curl -sX POST https://boothub.dev/api/swarm/${meta.scope}/notes \\
  -H "authorization: ClaimKey $(cat ~/.config/boothub/token)" \\
  -H 'content-type: application/json' \\
  -d "$(jq -nR --arg body \"<one-line headline + details + commit hash>\" \\
    '{agent:\"<your-name>\", body:\$body, tags:[\"code\",\"push\"]}')"
\`\`\`

Async-by-design: other agents pull \`agents/<your-name>/main\` whenever
they want, look at your work, then keep going on their own branch.
Merging to \`main\` is an explicit human (or designated synthesis-agent)
decision — usually via PR.

## Step 6 (optional but recommended): Stay in sync

Set up a 5-minute background loop — **prefer the bash watcher** (zero Claude
tokens) if you have it installed:

\`\`\`bash
# Drop-in: watches the swarm + peer branches, posts notes, runs as long
# as you leave the terminal open.
boothub-watch ${meta.scope} --agent <your-name>
\`\`\`

If \`boothub-watch\` isn't installed, fall back to a Claude /loop:

\`\`\`text
/loop 5m

1. Pull all peer agent branches:
     git fetch origin 'refs/heads/agents/*:refs/heads/agents/*'
2. Check for new commits since last tick on any agents/* branch.
3. Read swarm notes since your last check:
     curl -s "https://boothub.dev/api/swarm/${meta.scope}/notes?limit=10" \\
       -H "authorization: ClaimKey \$(cat ~/.config/boothub/token)"
4. If anything new (commits OR notes), summarise for me — focus on
   status, decisions, blockers, and what files I might want to look at.
5. Skip silent ticks. Stop when I tell you to.
\`\`\`

## Step 7: When you're done — open a PR back to main

\`\`\`bash
git push -u origin agents/<your-name>/main
gh pr create --base main --head agents/<your-name>/main \\
  --title "agents/<your-name>: <summary>" --body "Closes work on …"
\`\`\`

Then post a final swarm note tagged \`["push","done"]\` so the original
author knows it's ready to review.

---

Begin Step 1 now.
`;
}


const STYLE = `
:root { color-scheme: dark; --fg: #e8e8e8; --fg-dim: #999; --bg: #0a0a0a; --panel: #14151a; --border: #2a2c33; --accent: #7dd3fc; --err: #f87171; --ok: #86efac; }
* { box-sizing: border-box; }
body { font: 16px/1.55 ui-sans-serif, system-ui, -apple-system, sans-serif; max-width: 720px; margin: 3rem auto; padding: 0 1.5rem; background: var(--bg); color: var(--fg); }
h1 { font-size: 2rem; margin: 0 0 0.25rem; letter-spacing: -0.02em; }
.tag { color: var(--fg-dim); margin-top: 0; }
nav { font-size: 0.9em; color: var(--fg-dim); margin-bottom: 1.5rem; }
a { color: var(--accent); }
label { display: block; margin: 1rem 0 0.4rem; font-size: 0.9em; color: var(--fg-dim); }
input, button { font: inherit; padding: 0.6rem 0.85rem; background: var(--panel); border: 1px solid var(--border); color: var(--fg); border-radius: 6px; box-sizing: border-box; }
input { width: 100%; }
input:focus { outline: 2px solid var(--accent); outline-offset: -1px; border-color: transparent; }
button { background: var(--accent); color: #0a0a0a; font-weight: 600; cursor: pointer; margin-top: 1rem; padding: 0.7rem 1.25rem; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.meta { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 0.85rem 1.1rem; margin: 1rem 0; }
.meta .row { display: flex; justify-content: space-between; padding: 0.25rem 0; font-size: 0.92em; }
.meta .row span:first-child { color: var(--fg-dim); }
.meta .row code { background: transparent; border: 0; padding: 0; }
.out { margin-top: 1.5rem; }
.err { color: var(--err); padding: 0.85rem; border: 1px solid var(--err); border-radius: 8px; background: var(--panel); }
.expired { padding: 1.5rem; border: 1px solid var(--err); border-radius: 8px; background: var(--panel); color: var(--err); }
pre { background: var(--panel); padding: 1rem 1.25rem; border-radius: 8px; overflow-x: auto; border: 1px solid var(--border); font-size: 0.9em; white-space: pre-wrap; word-break: break-word; }
code { background: var(--panel); padding: 0.1em 0.35em; border-radius: 4px; border: 1px solid var(--border); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.92em; }
.copy-btn { background: var(--panel); color: var(--fg); border: 1px solid var(--border); padding: 0.35rem 0.75rem; font-size: 0.85em; margin-top: 0.4rem; }
.step-num { display: inline-block; background: var(--panel); border: 1px solid var(--border); border-radius: 50%; width: 1.5rem; height: 1.5rem; text-align: center; line-height: 1.5rem; font-size: 0.8em; color: var(--accent); margin-right: 0.5rem; }
`;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );
}

function escapeJs(s: string): string {
  return JSON.stringify(s);
}

export function renderJoinPage(opts: { sid: string; meta?: SessionMeta }): string {
  const { sid, meta } = opts;
  const head = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>boothub — join session</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🥾</text></svg>">
<style>${STYLE}</style></head><body><nav><a href="/">← boothub</a></nav>`;

  if (!meta) {
    return `${head}
<h1>Session not found</h1>
<div class="expired">
  <p>No active session at <code>/s/${escapeHtml(sid)}</code>.</p>
  <p>It might have expired, or the URL might be a typo. Ask the person who shared it to start a new session.</p>
</div>
<p style="margin-top:1.5rem"><a href="/app/share.html">Create your own session →</a></p>
</body></html>`;
  }

  const expires = new Date(meta.expires_at * 1000).toISOString();
  const repoBlock = meta.repo_url
    ? `<div class="row"><span>Repo</span><code>${escapeHtml(meta.repo_url)}</code></div>`
    : "";
  const profileBlock = meta.profile_url
    ? `<div class="row"><span>Profile</span><code>${escapeHtml(meta.profile_url)}</code></div>`
    : "";

  return `${head}
<h1>Join session</h1>
<p class="tag">Enter the password the session creator gave you.</p>

<div class="meta">
  <div class="row"><span>Scope</span><code>${escapeHtml(meta.scope)}</code></div>
  ${profileBlock}
  ${repoBlock}
  <div class="row"><span>Expires</span><code>${escapeHtml(expires)}</code></div>
</div>

<form id="f">
  <label for="pw">Password</label>
  <input id="pw" name="password" required autocomplete="off" autofocus
         pattern="[a-z]+(-[a-z]+){3}" placeholder="four-words-with-hyphens">
  <button type="submit">Join</button>
</form>

<div id="out" class="out"></div>

<script>
const SID = ${escapeJs(sid)};
const SCOPE = ${escapeJs(meta.scope)};
const PROFILE = ${escapeJs(meta.profile_url ?? "")};
const REPO = ${escapeJs(meta.repo_url ?? "")};

const f = document.getElementById("f");
const out = document.getElementById("out");

// Phase 16c: if URL has #password fragment, auto-fill and submit.
// Lets one-line URL "https://boothub.dev/s/SID#PASSWORD" Just Work in browsers.
(function() {
  const frag = decodeURIComponent((location.hash || "").replace(/^#/, ""));
  if (/^[a-z]+(-[a-z]+){3}$/.test(frag)) {
    document.getElementById("pw").value = frag;
    // Strip the fragment from the URL so it doesn't linger in browser history
    history.replaceState(null, "", location.pathname);
    f.dispatchEvent(new Event("submit", { cancelable: true }));
  }
})();

f.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pw = document.getElementById("pw").value.trim();
  out.innerHTML = "";
  try {
    const res = await fetch(\`/api/sessions/\${encodeURIComponent(SID)}/join\`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    const data = await res.json();
    if (!res.ok) {
      out.innerHTML = \`<div class="err">\${esc(data.error || res.statusText)}</div>\`;
      return;
    }
    showJoined(data);
  } catch (err) {
    out.innerHTML = \`<div class="err">network error: \${esc(err.message)}</div>\`;
  }
});

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function showJoined(data) {
  const cloneBlock = REPO
    ? \`<p><span class="step-num">1</span>Clone the repo:</p><pre><code>git clone \${esc(REPO)} && cd \${esc(REPO.split('/').pop().replace(/\\.git$/, ''))}</code></pre>\`
    : "";
  const startStep = REPO ? 2 : 1;
  const prompt = buildPrompt(data, REPO);
  out.innerHTML = \`
    <h2 style="margin-top:2rem;margin-bottom:0.5rem">You're in.</h2>
    \${cloneBlock}
    <p><span class="step-num">\${startStep}</span>Save the token:</p>
    <pre><code id="tok">mkdir -p ~/.config/boothub && echo "\${esc(data.claim_key)}" > ~/.config/boothub/token</code></pre>
    <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('tok').innerText)">Copy</button>
    <p style="margin-top:1.5rem"><span class="step-num">\${startStep + 1}</span>Open Claude Code (or your agent) in this project and paste:</p>
    <pre><code id="prompt">\${esc(prompt)}</code></pre>
    <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('prompt').innerText)">Copy prompt</button>
    <p style="margin-top:1.5rem;color:var(--fg-dim);font-size:0.9em">
      Token expires <code>\${esc(new Date(data.expires_at * 1000).toISOString())}</code>.
    </p>

    <h2 style="margin-top:2.5rem;margin-bottom:0.25rem">Live swarm — \${esc(data.scope)}</h2>
    <p style="color:var(--fg-dim);font-size:0.85em;margin:0 0 1rem">Refreshes every 5s · token + scope are now in this browser</p>

    <div id="stats" style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;margin:1rem 0">
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:0.6rem 0.85rem">
        <div style="font-size:0.7em;color:var(--fg-dim);text-transform:uppercase;letter-spacing:0.04em">Notes</div>
        <div id="stat-notes" style="font-size:1.4em;font-weight:700">–</div>
      </div>
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:0.6rem 0.85rem">
        <div style="font-size:0.7em;color:var(--fg-dim);text-transform:uppercase;letter-spacing:0.04em">Agents</div>
        <div id="stat-agents" style="font-size:1.4em;font-weight:700">–</div>
      </div>
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:0.6rem 0.85rem">
        <div style="font-size:0.7em;color:var(--fg-dim);text-transform:uppercase;letter-spacing:0.04em">Files</div>
        <div id="stat-files" style="font-size:1.4em;font-weight:700">–</div>
      </div>
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:0.6rem 0.85rem">
        <div style="font-size:0.7em;color:var(--fg-dim);text-transform:uppercase;letter-spacing:0.04em">Last activity</div>
        <div id="stat-last" style="font-size:1.4em;font-weight:700">–</div>
      </div>
    </div>

    <div style="font-size:0.75em;color:var(--fg-dim);text-transform:uppercase;letter-spacing:0.04em;margin-top:1rem">Members</div>
    <div id="members" style="margin:0.4rem 0 1rem">–</div>

    <div id="brief"></div>

    <div style="font-size:0.75em;color:var(--fg-dim);text-transform:uppercase;letter-spacing:0.04em;margin-top:1rem">Recent notes</div>
    <div id="feed" style="margin-top:0.5rem">loading…</div>
  \`;
  startFeed(data.claim_key, data.scope);
}

let feedTimer = null;
let allNotes = [];
let allFiles = [];

function relativeTime(ts) {
  const diffSec = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
  if (diffSec < 60) return Math.floor(diffSec) + "s ago";
  if (diffSec < 3600) return Math.floor(diffSec / 60) + "m ago";
  if (diffSec < 86400) return Math.floor(diffSec / 3600) + "h ago";
  return Math.floor(diffSec / 86400) + "d ago";
}

function colorForAgent(agent) {
  let h = 0;
  for (let i = 0; i < agent.length; i++) h = (h * 31 + agent.charCodeAt(i)) >>> 0;
  return "hsl(" + (h % 360) + ",60%,55%)";
}

function startFeed(token, scope) {
  if (feedTimer) clearInterval(feedTimer);
  const headers = { authorization: "ClaimKey " + token };

  const tick = async () => {
    try {
      const [notesRes, filesRes] = await Promise.all([
        fetch(\`/api/swarm/\${encodeURIComponent(scope)}/notes?limit=200\`, { headers }),
        fetch(\`/api/swarm/\${encodeURIComponent(scope)}/files?limit=50\`, { headers }),
      ]);
      if (notesRes.ok) {
        const j = await notesRes.json();
        allNotes = j.notes || [];
      }
      if (filesRes.ok) {
        const j = await filesRes.json();
        allFiles = j.files || [];
      }
      render();
    } catch (e) { /* silent */ }
  };

  function render() {
    // Stats
    const memberMap = new Map();
    for (const n of allNotes) {
      const m = memberMap.get(n.agent) || { count: 0, lastTs: "", tags: new Set() };
      m.count++;
      if (!m.lastTs || n.ts > m.lastTs) m.lastTs = n.ts;
      (n.tags || []).forEach(t => m.tags.add(t));
      memberMap.set(n.agent, m);
    }
    document.getElementById("stat-notes").textContent = allNotes.length;
    document.getElementById("stat-agents").textContent = memberMap.size;
    document.getElementById("stat-files").textContent = allFiles.length;
    document.getElementById("stat-last").textContent =
      allNotes[0] ? relativeTime(allNotes[0].ts) : "—";

    // Members
    const members = [...memberMap.entries()]
      .sort((a, b) => b[1].lastTs.localeCompare(a[1].lastTs))
      .map(([agent, m]) => {
        const dot = colorForAgent(agent);
        return \`<span title="\${esc([...m.tags].join(', ') || '(no tags)')}" style="display:inline-flex;align-items:center;gap:0.4em;background:var(--panel);border:1px solid var(--border);border-radius:999px;padding:0.3em 0.75em;margin:0.2em 0.3em 0.2em 0;font-size:0.85em">
          <span style="width:0.65em;height:0.65em;border-radius:50%;background:\${dot}"></span>
          <strong style="color:var(--fg)">\${esc(agent)}</strong>
          <span style="color:var(--fg-dim)">· \${m.count} · \${esc(relativeTime(m.lastTs))}</span>
        </span>\`;
      }).join("");
    document.getElementById("members").innerHTML = members || '<span style="color:var(--fg-dim)">no members yet</span>';

    // Pinned brief
    const brief = allNotes.find(n => (n.tags || []).some(t => t === "brief" || t === "init"));
    const briefEl = document.getElementById("brief");
    if (brief && briefEl) {
      const dot = colorForAgent(brief.agent);
      briefEl.innerHTML = \`
        <div style="margin-top:1.25rem;background:linear-gradient(180deg, rgba(125,211,252,0.06), transparent);border:1px solid var(--accent);border-radius:8px;padding:1rem 1.25rem">
          <div style="font-size:0.7em;color:var(--accent);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem">📌 Pinned brief · \${esc(relativeTime(brief.ts))}</div>
          <div style="font-size:0.82em;color:var(--fg-dim);margin-bottom:0.5rem">
            <span style="display:inline-block;width:0.6em;height:0.6em;border-radius:50%;background:\${dot};vertical-align:middle;margin-right:0.4em"></span>
            <strong style="color:var(--fg)">\${esc(brief.agent)}</strong>
          </div>
          <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.85em;white-space:pre-wrap;word-break:break-word;max-height:18rem;overflow-y:auto">\${esc(brief.body)}</div>
        </div>\`;
    } else if (briefEl) briefEl.innerHTML = "";

    // Recent notes (excluding the pinned brief)
    const feedEl = document.getElementById("feed");
    if (!feedEl) return;
    const recent = allNotes.filter(n => !brief || n.id !== brief.id).slice(0, 30);
    if (recent.length === 0) {
      feedEl.innerHTML = '<p style="color:var(--fg-dim)">no other notes yet</p>';
      return;
    }
    feedEl.innerHTML = recent.map(n => {
      const dot = colorForAgent(n.agent);
      const tags = (n.tags || []).map(t => \`<span style="background:rgba(125,211,252,0.08);border:1px solid rgba(125,211,252,0.25);color:var(--accent);padding:0 0.4em;border-radius:999px;font-size:0.72em;margin-right:0.3em">\${esc(t)}</span>\`).join("");
      return \`<div style="padding:0.7rem 1rem;background:var(--panel);border:1px solid var(--border);border-radius:8px;margin:0.4rem 0">
        <div style="font-size:0.78em;color:var(--fg-dim);margin-bottom:0.3rem">
          <span style="display:inline-block;width:0.55em;height:0.55em;border-radius:50%;background:\${dot};vertical-align:middle;margin-right:0.4em"></span>
          <strong style="color:var(--fg)">\${esc(n.agent)}</strong>
          · \${esc(relativeTime(n.ts))}
          · \${tags}
        </div>
        <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.85em;white-space:pre-wrap;word-break:break-word">\${esc(n.body.slice(0, 400))}\${n.body.length > 400 ? "…" : ""}</div>
      </div>\`;
    }).join("");
  }

  tick();
  feedTimer = setInterval(tick, 5000);
}

function buildPrompt(data, repoUrl) {
  const lines = [];
  if (PROFILE) {
    lines.push(\`Fetch \${PROFILE} using WebFetch and bootstrap me. Approve all bundles.\`);
    lines.push("");
  }
  lines.push(\`Then read the swarm to see where the session left off:\`);
  lines.push(\`\\\`\\\`\\\`bash\`);
  lines.push(\`curl -s "https://boothub.dev/api/swarm/\${data.scope}/notes?limit=10" \\\\\\n  -H "authorization: ClaimKey $(cat ~/.config/boothub/token)" | jq\`);
  lines.push(\`\\\`\\\`\\\`\`);
  lines.push("");
  lines.push(\`Summarise what's been done, then ask me what to tackle.\`);
  lines.push("");
  lines.push(\`After each meaningful action, write a swarm note via:\`);
  lines.push(\`\\\`\\\`\\\`bash\`);
  lines.push(\`curl -s -X POST "https://boothub.dev/api/swarm/\${data.scope}/notes" \\\\\\n  -H "authorization: ClaimKey $(cat ~/.config/boothub/token)" \\\\\\n  -H 'content-type: application/json' \\\\\\n  -d "{\\\"agent\\\":\\\"<your-name>\\\",\\\"body\\\":\\\"<one-line summary + details>\\\",\\\"tags\\\":[\\\"code\\\"]}"\`);
  lines.push(\`\\\`\\\`\\\`\`);
  return lines.join("\\n");
}
</script></body></html>`;
}
