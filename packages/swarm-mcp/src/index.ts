import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { BoothubClient } from "./api.js";

const TOOLS: Tool[] = [
  {
    name: "swarm_write",
    description:
      "Write a markdown note to the boothub-hosted swarm. The note becomes visible to other agents in the same scope. Use after each meaningful action.",
    inputSchema: {
      type: "object",
      required: ["scope", "agent", "body"],
      properties: {
        scope: { type: "string", description: "the swarm scope (project / topic identifier)" },
        agent: { type: "string", description: "your agent identifier (e.g. cortex, builder)" },
        body: { type: "string", description: "markdown body of the note" },
        tags: { type: "array", items: { type: "string" }, description: "optional tags" },
      },
    },
  },
  {
    name: "swarm_read",
    description:
      "List recent notes in a swarm scope. Default returns the 50 most recent notes (newest first).",
    inputSchema: {
      type: "object",
      required: ["scope"],
      properties: {
        scope: { type: "string" },
        limit: { type: "number", description: "max notes to return (1-200, default 50)" },
        since: {
          type: "string",
          description: "ISO timestamp; only return notes newer than this",
        },
      },
    },
  },
  {
    name: "swarm_synthesize",
    description:
      "Server-side aggregation of recent notes into a single markdown summary, grouped by agent. Cheap to call; useful before starting work.",
    inputSchema: {
      type: "object",
      required: ["scope"],
      properties: {
        scope: { type: "string" },
        limit: { type: "number", description: "how many notes to aggregate (default 100)" },
      },
    },
  },
  {
    name: "swarm_status",
    description: "Quick status: note count, agents seen, latest activity timestamp.",
    inputSchema: {
      type: "object",
      required: ["scope"],
      properties: { scope: { type: "string" } },
    },
  },
];

export async function runMcpServer(): Promise<void> {
  const client = new BoothubClient();
  if (!client.hasToken()) {
    process.stderr.write(
      "warning: no boothub token; tool calls will fail until you run `npx @boothub/swarm-mcp login`\n",
    );
  }

  const server = new Server(
    { name: "boothub-swarm-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: rawArgs } = req.params;
    const args = (rawArgs ?? {}) as Record<string, unknown>;
    try {
      switch (name) {
        case "swarm_write": {
          const note = await client.writeNote({
            scope: String(args.scope),
            agent: String(args.agent),
            body: String(args.body),
            tags: Array.isArray(args.tags) ? (args.tags as unknown[]).map(String) : undefined,
          });
          return {
            content: [
              {
                type: "text",
                text: `wrote note ${note.id} to scope "${note.scope}" at ${note.ts}`,
              },
            ],
          };
        }
        case "swarm_read": {
          const { notes } = await client.listNotes({
            scope: String(args.scope),
            limit: typeof args.limit === "number" ? args.limit : undefined,
            since: typeof args.since === "string" ? args.since : undefined,
          });
          const text = notes.length
            ? notes
                .map(
                  (n) => `## ${n.agent} @ ${n.ts} (${n.id})\n${n.body}`,
                )
                .join("\n\n")
            : `(no notes in scope "${args.scope}")`;
          return { content: [{ type: "text", text }] };
        }
        case "swarm_synthesize": {
          const text = await client.synthesize(
            String(args.scope),
            typeof args.limit === "number" ? args.limit : undefined,
          );
          return { content: [{ type: "text", text }] };
        }
        case "swarm_status": {
          const { notes } = await client.listNotes({ scope: String(args.scope), limit: 200 });
          const agents = new Set(notes.map((n) => n.agent));
          const latest = notes[0]?.ts ?? "(none)";
          return {
            content: [
              {
                type: "text",
                text: `scope="${args.scope}" notes=${notes.length} agents=${agents.size} latest=${latest}\n  agents: ${[...agents].join(", ") || "(none)"}`,
              },
            ],
          };
        }
        default:
          return {
            content: [{ type: "text", text: `unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (e) {
      return {
        content: [{ type: "text", text: `error: ${(e as Error).message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("boothub-swarm-mcp listening on stdio\n");
}
