import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer, listToolNames } from "./create-server.js";
import { loadSlotsFromRulesDir } from "./load-slots.js";

const rulesDir = resolve(process.cwd(), "rules");

export { createMcpServer };

export async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const acceptsEventStream = req.headers.accept
    ?.toLowerCase()
    .includes("text/event-stream");

  const slots = await loadSlotsFromRulesDir(rulesDir);
  const tools = listToolNames(slots);

  if (req.method === "GET" && !acceptsEventStream) {
    res.writeHead(200, {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "amazon-slot-image",
        transport: "streamable-http",
        endpoint: "/mcp",
        slots: slots.map((s) => ({ id: s.id, tool: s.toolName, role: s.roleName })),
        tools,
      }),
    );
    return;
  }

  if (req.method !== "POST" && req.method !== "GET") {
    res.writeHead(405, {
      allow: "GET, POST",
      "content-type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const server = createMcpServer({ slots });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res);
}
