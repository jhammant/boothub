#!/usr/bin/env tsx
// Local Node HTTP shim that wraps the Lambda handler — no AWS, no SAM.
// Run: npm run dev:lambda
import { createServer } from "node:http";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { handler } from "./handler.ts";

const PORT = Number(process.env.PORT ?? 8788);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const event: APIGatewayProxyEventV2 = {
    version: "2.0",
    routeKey: "$default",
    rawPath: url.pathname,
    rawQueryString: url.search.replace(/^\?/, ""),
    headers: Object.fromEntries(
      Object.entries(req.headers).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v.join(",") : v ?? ""]),
    ),
    queryStringParameters: Object.fromEntries(url.searchParams.entries()),
    requestContext: {
      accountId: "local",
      apiId: "local",
      domainName: "localhost",
      domainPrefix: "local",
      http: {
        method: req.method ?? "GET",
        path: url.pathname,
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: req.headers["user-agent"] ?? "",
      },
      requestId: crypto.randomUUID(),
      routeKey: "$default",
      stage: "$default",
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
    isBase64Encoded: false,
  };

  try {
    const result = await handler(event);
    if (typeof result === "string") {
      res.writeHead(200, { "content-type": "text/markdown" });
      res.end(result);
      return;
    }
    res.writeHead(result.statusCode ?? 200, {
      ...(result.headers as Record<string, string> | undefined),
    });
    res.end(result.body ?? "");
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(`internal error: ${(e as Error).message}`);
  }
});

server.listen(PORT, () => {
  console.log(`boothub dev server listening on http://localhost:${PORT}`);
  console.log(`  try: curl http://localhost:${PORT}/jhammant`);
  console.log(`       curl http://localhost:${PORT}/jhammant/swarm`);
});
